/**
 * translate-ko.js
 *
 * Automatically translates English i18next JSON files to Korean using the DeepL API.
 * Only translates strings that are missing or empty in the Korean files (idempotent).
 * Preserves all placeholders (e.g. {{count}}, {{name}}) and nested JSON structure.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────────
 * 1. Install dependencies (run from the frontend/ folder):
 *      npm install axios dotenv fs-extra
 *
 * 2. Get a free DeepL API key at: https://www.deepl.com/pro-api
 *    (Free tier: 500,000 characters/month)
 *
 * 3. Create a .env file in the frontend/ folder:
 *      DEEPL_API_KEY=your_key_here
 *
 * 4. (Optional) Edit scripts/glossary.json to customise term mappings.
 *
 * 5. Run from the frontend/ folder:
 *      node scripts/translate-ko.js
 *
 * ── Required dev dependencies (add to package.json) ───────────────────────────
 * "devDependencies": {
 *   "axios": "^1.6.0",
 *   "dotenv": "^16.0.0",
 *   "fs-extra": "^11.0.0"
 * }
 */

// Load .env from the frontend/ folder (parent of scripts/)
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ── Configuration ──────────────────────────────────────────────────────────────

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

// Use the DeepL free-tier endpoint. If you have a paid plan, use:
// https://api.deepl.com/v2/translate
const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

const SOURCE_LANG = "EN";
const TARGET_LANG = "KO";

// Delay between API calls (ms). 1000ms = 1 req/sec, well within DeepL free limits.
const RATE_LIMIT_MS = 1000;

const LOCALES_DIR = path.join(__dirname, "..", "locales");
const EN_DIR = path.join(LOCALES_DIR, "en");
const KO_DIR = path.join(LOCALES_DIR, "ko");
const GLOSSARY_PATH = path.join(__dirname, "glossary.json");

// ── Glossary ───────────────────────────────────────────────────────────────────

// Load a custom glossary if present, otherwise fall back to defaults.
// The glossary maps English terms → Korean terms. Entries are applied
// AFTER DeepL translation via simple string replacement.
let glossary = {};
if (fs.existsSync(GLOSSARY_PATH)) {
  glossary = JSON.parse(fs.readFileSync(GLOSSARY_PATH, "utf-8"));
  console.log(`📖 Loaded glossary with ${Object.keys(glossary).length} entries`);
} else {
  glossary = {
    Leaderboard: "리더보드",
    Challenge: "대결 신청",
    XP: "XP",
    Quest: "퀘스트",
    Streak: "연속 학습",
    "Level up": "레벨 업",
    Badge: "뱃지",
    League: "리그",
    Promote: "승급",
    Demote: "강등",
    Profile: "프로필",
    Dashboard: "대시보드",
    Settings: "설정",
    Lesson: "레슨",
    Lessons: "레슨",
  };
  console.log(`📖 Using default glossary (${Object.keys(glossary).length} entries)`);
}

// ── Translation Stats ──────────────────────────────────────────────────────────

const stats = { translated: 0, skipped: 0, errors: 0 };

// ── Placeholder Handling ───────────────────────────────────────────────────────

/**
 * Replace {{placeholder}} tokens with numbered markers before sending to DeepL.
 * DeepL will leave the markers untouched, and we restore them after translation.
 *
 * Example: "Hello {{name}}!" → "Hello __PH0__!" → translate → "안녕하세요 __PH0__!" → "안녕하세요 {{name}}!"
 */
function extractPlaceholders(text) {
  const placeholders = [];
  const tokenized = text.replace(/\{\{[^}]+\}\}/g, (match) => {
    const token = `XPHX${placeholders.length}XPHX`;
    placeholders.push({ token, original: match });
    return token;
  });
  return { tokenized, placeholders };
}

function restorePlaceholders(text, placeholders) {
  let restored = text;
  for (const { token, original } of placeholders) {
    // Escape the token for use in a regex
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    restored = restored.replace(new RegExp(escaped, "g"), original);
  }
  return restored;
}

// ── Glossary Post-Processing ───────────────────────────────────────────────────

/**
 * After DeepL translates the text, scan for any glossary English terms that
 * DeepL may have left untranslated and substitute our preferred Korean.
 * This is a simple whole-word replacement (case-insensitive).
 */
function applyGlossaryPostProcess(translatedText) {
  let result = translatedText;
  for (const [en, ko] of Object.entries(glossary)) {
    // Match whole word only to avoid partial replacements
    const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    result = result.replace(regex, ko);
  }
  return result;
}

// ── DeepL API ──────────────────────────────────────────────────────────────────

/**
 * Translate a single string via DeepL.
 * Returns the Korean translation with placeholders intact.
 */
async function translateString(text) {
  if (!text || text.trim() === "") return text;

  const { tokenized, placeholders } = extractPlaceholders(text);

  const params = new URLSearchParams({
    auth_key: DEEPL_API_KEY,
    text: tokenized,
    source_lang: SOURCE_LANG,
    target_lang: TARGET_LANG,
    preserve_formatting: "1",
  });

  const response = await axios.post(DEEPL_API_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const translated = response.data.translations[0].text;
  const restored = restorePlaceholders(translated, placeholders);
  return applyGlossaryPostProcess(restored);
}

/** Sleep helper for rate limiting. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── JSON Traversal Helpers ─────────────────────────────────────────────────────

/**
 * Recursively collect all translatable leaf values from a JSON object.
 * Each entry: { path: string[], value: string }
 *
 * Handles nested objects and arrays of strings.
 */
function collectLeaves(obj, currentPath = []) {
  const leaves = [];
  for (const [key, value] of Object.entries(obj)) {
    const keyPath = [...currentPath, key];
    if (typeof value === "string") {
      leaves.push({ path: keyPath, value });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const itemPath = [...keyPath, index];
        if (typeof item === "string") {
          leaves.push({ path: itemPath, value: item });
        } else if (typeof item === "object" && item !== null) {
          leaves.push(...collectLeaves(item, itemPath));
        }
      });
    } else if (typeof value === "object" && value !== null) {
      leaves.push(...collectLeaves(value, keyPath));
    }
  }
  return leaves;
}

/** Get a deeply nested value by path array. */
function getByPath(obj, pathArr) {
  return pathArr.reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

/**
 * Set a deeply nested value by path array.
 * Creates intermediate objects/arrays as needed.
 */
function setByPath(obj, pathArr, value) {
  let current = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i];
    const nextKey = pathArr[i + 1];
    if (current[key] == null) {
      current[key] = typeof nextKey === "number" ? [] : {};
    }
    current = current[key];
  }
  current[pathArr[pathArr.length - 1]] = value;
}

// ── File Processor ─────────────────────────────────────────────────────────────

/**
 * Translate a single JSON file (en → ko).
 * Only strings missing or empty in the Korean file are sent to DeepL.
 */
async function translateFile(enPath, koPath) {
  const fileName = path.basename(enPath);
  console.log(`\n📄 ${fileName}`);

  const enData = JSON.parse(fs.readFileSync(enPath, "utf-8"));

  // Load existing Korean translations (if the file already exists)
  let koData = {};
  if (fs.existsSync(koPath)) {
    koData = JSON.parse(fs.readFileSync(koPath, "utf-8"));
  }

  const leaves = collectLeaves(enData);
  let fileTranslated = 0;
  let fileSkipped = 0;

  for (let i = 0; i < leaves.length; i++) {
    const { path: leafPath, value: enValue } = leaves[i];

    // Skip empty English strings
    if (!enValue || enValue.trim() === "") {
      fileSkipped++;
      stats.skipped++;
      continue;
    }

    // Skip if a non-empty Korean translation already exists
    const existingKo = getByPath(koData, leafPath);
    if (existingKo && typeof existingKo === "string" && existingKo.trim() !== "") {
      fileSkipped++;
      stats.skipped++;
      continue;
    }

    // Log progress every 10 strings
    if (i > 0 && i % 10 === 0) {
      console.log(`  … ${i}/${leaves.length} processed`);
    }

    try {
      const koValue = await translateString(enValue);
      setByPath(koData, leafPath, koValue);
      fileTranslated++;
      stats.translated++;

      // Rate limit: 1 request per second
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error(`  ❌ [${leafPath.join(".")}] ${msg}`);
      stats.errors++;
    }
  }

  // Write the (possibly updated) Korean file
  await fs.ensureDir(path.dirname(koPath));
  fs.writeFileSync(koPath, JSON.stringify(koData, null, 2) + "\n", "utf-8");

  console.log(`  ✅ translated: ${fileTranslated} | skipped: ${fileSkipped}`);
}

// ── Entry Point ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌐 SignLingo Auto-Translator  EN → KO");
  console.log("──────────────────────────────────────");

  // Validate API key
  if (!DEEPL_API_KEY) {
    console.error("\n❌  DEEPL_API_KEY is not set.");
    console.error("    Create a .env file in the frontend/ folder:");
    console.error("    DEEPL_API_KEY=your_key_here");
    console.error("    Get a free key at: https://www.deepl.com/pro-api\n");
    process.exit(1);
  }

  // Validate locales/en/ folder
  if (!fs.existsSync(EN_DIR)) {
    console.error(`\n❌  Source folder not found: ${EN_DIR}\n`);
    process.exit(1);
  }

  const enFiles = fs.readdirSync(EN_DIR).filter((f) => f.endsWith(".json"));
  if (enFiles.length === 0) {
    console.error(`\n❌  No JSON files found in ${EN_DIR}\n`);
    process.exit(1);
  }

  console.log(`\nFiles: ${enFiles.join(", ")}`);
  console.log(`Target: locales/ko/\n`);

  for (const file of enFiles) {
    await translateFile(path.join(EN_DIR, file), path.join(KO_DIR, file));
  }

  console.log("\n──────────────────────────────────────");
  console.log("📊 Summary");
  console.log(`   ✅ Translated : ${stats.translated}`);
  console.log(`   ⏭  Skipped   : ${stats.skipped}`);
  console.log(`   ❌ Errors     : ${stats.errors}`);
  console.log("──────────────────────────────────────");

  if (stats.errors > 0) {
    console.log("\n⚠️  Run the script again to retry failed strings.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
