/**
 * Canonical mock data for the gamification module.
 *
 * The Zustand store (useGamificationStore) embeds its own initial data so it
 * can persist state independently. This file is the single source of truth for
 * the shape and content of mock fixtures – useful for tests, Storybook, or
 * seeding the store in a fresh environment.
 */

import type { Badge, Reward, DailyQuest, UserProgress } from "@/components/gamification/useGamificationStore";

// ── Level thresholds (cumulative XP) ──────────────────────────────────────
// Level 1 = 0 XP, Level 2 = 200 XP, Level 3 = 500 XP, Level 4 = 900 XP, …
export const LEVEL_THRESHOLDS: number[] = [
  0,    // level 1
  200,  // level 2
  500,  // level 3
  900,  // level 4
  1400, // level 5
  2000, // level 6
  2700, // level 7
  3500, // level 8
  4400, // level 9
  5400, // level 10
];

// ── Initial user progress ─────────────────────────────────────────────────
export const MOCK_USER_PROGRESS: UserProgress = {
  level: 7,
  totalXp: 1750,
  xpToNextLevel: 250,
  levelProgressPercent: 75,
  dailyStreak: 5,
  lastActiveDate: new Date().toISOString().split("T")[0],
};

// ── Badges ────────────────────────────────────────────────────────────────
export const MOCK_BADGES: Badge[] = [
  {
    id: "first-sign",
    icon: "🤟",
    requiredValue: 1,
    currentProgress: 1,
    isLocked: false,
    earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    category: "lessons",
    rarity: "common",
  },
  {
    id: "streak-starter",
    icon: "🔥",
    requiredValue: 3,
    currentProgress: 3,
    isLocked: false,
    earnedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    category: "streak",
    rarity: "common",
  },
  {
    id: "week-warrior",
    icon: "⚡",
    requiredValue: 7,
    currentProgress: 5,
    isLocked: true,
    category: "streak",
    rarity: "rare",
  },
  {
    id: "lesson-master",
    icon: "📚",
    requiredValue: 10,
    currentProgress: 7,
    isLocked: true,
    category: "lessons",
    rarity: "common",
  },
  {
    id: "quiz-ace",
    icon: "🎯",
    requiredValue: 5,
    currentProgress: 2,
    isLocked: true,
    category: "quizzes",
    rarity: "rare",
  },
  {
    id: "bronze-champion",
    icon: "🥉",
    requiredValue: 1,
    currentProgress: 1,
    isLocked: false,
    earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    category: "league",
    rarity: "common",
  },
  {
    id: "silver-star",
    icon: "🥈",
    requiredValue: 1,
    currentProgress: 0,
    isLocked: true,
    category: "league",
    rarity: "rare",
  },
  {
    id: "gold-legend",
    icon: "🥇",
    requiredValue: 1,
    currentProgress: 0,
    isLocked: true,
    category: "league",
    rarity: "epic",
  },
  {
    id: "ai-explorer",
    icon: "🤖",
    requiredValue: 20,
    currentProgress: 12,
    isLocked: true,
    category: "lessons",
    rarity: "rare",
  },
  {
    id: "month-master",
    icon: "🏆",
    requiredValue: 30,
    currentProgress: 5,
    isLocked: true,
    category: "streak",
    rarity: "epic",
  },
];

// ── Rewards ───────────────────────────────────────────────────────────────
export const MOCK_REWARDS: Reward[] = [
  {
    id: "streak-freeze",
    cost: 200,
    icon: "🧊",
    isRedeemed: false,
  },
  {
    id: "double-xp",
    cost: 350,
    icon: "⚡",
    isRedeemed: false,
  },
  {
    id: "custom-avatar",
    cost: 500,
    icon: "🎨",
    isRedeemed: false,
  },
  {
    id: "bonus-lesson",
    cost: 300,
    icon: "🎁",
    isRedeemed: true,
    redeemedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "hint-pack",
    cost: 150,
    icon: "💡",
    isRedeemed: false,
  },
];

// ── Daily quests ──────────────────────────────────────────────────────────
export const MOCK_DAILY_QUESTS: DailyQuest[] = [
  {
    id: "quest-lesson",
    xpReward: 50,
    progress: 2,
    total: 3,
    completed: false,
    actionType: "complete_lesson",
    actionCount: 3,
  },
  {
    id: "quest-quiz",
    xpReward: 30,
    progress: 1,
    total: 1,
    completed: true,
    actionType: "score_quiz",
  },
  {
    id: "quest-practice",
    xpReward: 25,
    progress: 0,
    total: 1,
    completed: false,
    actionType: "practice_ai",
  },
];
