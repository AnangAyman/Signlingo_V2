from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


DEFAULT_LANGUAGE = "en"
SUPPORTED_LANGUAGES = ("en", "ko")
TRANSLATIONS_DIR = Path(__file__).resolve().parent / "translations"


def normalize_language(value: str | None) -> str:
    if value in SUPPORTED_LANGUAGES:
        return value
    return DEFAULT_LANGUAGE


def get_translation(language: str, key: str, default: str | None = None) -> str:
    normalized = normalize_language(language)
    localized = load_language_catalog(normalized)
    if key in localized:
        return localized[key]

    english = load_language_catalog(DEFAULT_LANGUAGE)
    if key in english:
        return english[key]

    return default if default is not None else key


@lru_cache(maxsize=None)
def load_language_catalog(language: str) -> dict[str, str]:
    normalized = normalize_language(language)
    catalog: dict[str, str] = {}
    language_dir = TRANSLATIONS_DIR / normalized
    if not language_dir.exists():
        return catalog

    for path in sorted(language_dir.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            payload = json.load(handle)
        if not isinstance(payload, dict):
            raise ValueError(f"Translation file must contain a flat object: {path}")
        for key, value in payload.items():
            catalog[str(key)] = str(value)
    return catalog
