"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/store";

// ============================================================
// TYPES
// ============================================================

export interface Badge {
  id: string;
  icon: string;
  requiredValue: number;
  currentProgress: number;
  isLocked: boolean;
  earnedAt?: Date;
  category: "streak" | "lessons" | "quizzes" | "league";
  rarity: "common" | "rare" | "epic";
}

export interface Reward {
  id: string;
  cost: number;
  icon: string;
  isRedeemed: boolean;
  redeemedAt?: Date;
}

export interface DailyQuest {
  id: string;
  xpReward: number;
  progress: number;
  total: number;
  completed: boolean;
  actionType: "complete_lesson" | "score_quiz" | "practice_ai" | "daily_streak";
  actionCount?: number;
}

export interface UserProgress {
  level: number;
  totalXp: number;
  xpToNextLevel: number;
  levelProgressPercent: number;
  dailyStreak: number;
  lastActiveDate: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const INITIAL_BADGES: Badge[] = [
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

const INITIAL_REWARDS: Reward[] = [
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

const INITIAL_QUESTS: DailyQuest[] = [
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

const INITIAL_PROGRESS: UserProgress = {
  level: 7,
  totalXp: 1750,
  xpToNextLevel: 250,
  levelProgressPercent: 75,
  dailyStreak: 5,
  lastActiveDate: new Date().toISOString().split("T")[0],
};

// ============================================================
// STORE
// ============================================================

interface GamificationStore {
  userProgress: UserProgress;
  badges: Badge[];
  rewards: Reward[];
  dailyQuests: DailyQuest[];
  showLevelUpModal: boolean;
  newLevel: number | null;
  newlyEarnedBadge: Badge | null;

  addXp: (amount: number, source: string) => void;
  redeemReward: (rewardId: string) => boolean;
  completeQuest: (questId: string) => void;
  checkBadges: () => Badge | null;
  syncFromUser: (user: User) => void;
  resetDemo: () => void;
  closeLevelUpModal: () => void;
  clearNewBadge: () => void;
  simulateNewDay: () => void;
}

function progressFromUser(user: Pick<User, "xp" | "level" | "dailyStreak">): UserProgress {
  const currentLevelXp = user.xp % 500;
  const xpToNextLevel = currentLevelXp === 0 ? 500 : 500 - currentLevelXp;

  return {
    level: user.level,
    totalXp: user.xp,
    xpToNextLevel,
    levelProgressPercent: (currentLevelXp / 500) * 100,
    dailyStreak: user.dailyStreak,
    lastActiveDate: new Date().toISOString().split("T")[0],
  };
}

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      userProgress: INITIAL_PROGRESS,
      badges: INITIAL_BADGES,
      rewards: INITIAL_REWARDS,
      dailyQuests: INITIAL_QUESTS,
      showLevelUpModal: false,
      newLevel: null,
      newlyEarnedBadge: null,

      addXp: (amount: number, source: string) => {
        const { userProgress, checkBadges } = get();
        let newTotalXp = userProgress.totalXp + amount;
        let newLevel = userProgress.level;
        let newXpToNext = userProgress.xpToNextLevel - amount;
        let showLevelUp = false;

        // Level up check
        while (newXpToNext <= 0) {
          newLevel += 1;
          newXpToNext += 500; // 500 XP per level
          showLevelUp = true;
        }

        const levelProgressPercent = ((500 - newXpToNext) / 500) * 100;

        set({
          userProgress: {
            ...userProgress,
            totalXp: newTotalXp,
            level: newLevel,
            xpToNextLevel: newXpToNext,
            levelProgressPercent,
            lastActiveDate: new Date().toISOString().split("T")[0],
          },
          showLevelUpModal: showLevelUp,
          newLevel: showLevelUp ? newLevel : null,
        });

        // Check for new badges
        const newBadge = checkBadges();
        if (newBadge) {
          set({ newlyEarnedBadge: newBadge });
        }
      },

      redeemReward: (rewardId: string) => {
        const { rewards, userProgress } = get();
        const reward = rewards.find((r) => r.id === rewardId);

        if (!reward || reward.isRedeemed || userProgress.totalXp < reward.cost) {
          return false;
        }

        set({
          rewards: rewards.map((r) =>
            r.id === rewardId
              ? { ...r, isRedeemed: true, redeemedAt: new Date() }
              : r
          ),
          userProgress: {
            ...userProgress,
            totalXp: userProgress.totalXp - reward.cost,
          },
        });

        return true;
      },

      completeQuest: (questId: string) => {
        const { dailyQuests, addXp } = get();
        const quest = dailyQuests.find((q) => q.id === questId);

        if (!quest || quest.completed || quest.progress < quest.total) {
          return;
        }

        set({
          dailyQuests: dailyQuests.map((q) =>
            q.id === questId ? { ...q, completed: true } : q
          ),
        });

        addXp(quest.xpReward, `quest:${questId}`);
      },

      checkBadges: () => {
        const { badges, userProgress } = get();
        let earnedBadge: Badge | null = null;

        const updatedBadges = badges.map((badge) => {
          if (badge.isLocked && badge.currentProgress >= badge.requiredValue) {
            earnedBadge = { ...badge, isLocked: false, earnedAt: new Date() };
            return earnedBadge;
          }
          return badge;
        });

        if (earnedBadge) {
          set({ badges: updatedBadges });
        }

        return earnedBadge;
      },

      syncFromUser: (user: User) => {
        set({
          userProgress: {
            ...get().userProgress,
            ...progressFromUser(user),
          },
        });
      },

      resetDemo: () => {
        set({
          userProgress: INITIAL_PROGRESS,
          badges: INITIAL_BADGES,
          rewards: INITIAL_REWARDS.map((r) => ({ ...r, isRedeemed: false, redeemedAt: undefined })),
          dailyQuests: INITIAL_QUESTS.map((q) => ({ ...q, progress: 0, completed: false })),
          showLevelUpModal: false,
          newLevel: null,
          newlyEarnedBadge: null,
        });
      },

      closeLevelUpModal: () => {
        set({ showLevelUpModal: false, newLevel: null });
      },

      clearNewBadge: () => {
        set({ newlyEarnedBadge: null });
      },

      simulateNewDay: () => {
        const { userProgress, dailyQuests } = get();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        // Check if user was active yesterday
        const wasActiveYesterday = userProgress.lastActiveDate === yesterdayStr;
        const newStreak = wasActiveYesterday ? userProgress.dailyStreak + 1 : 1;

        set({
          userProgress: {
            ...userProgress,
            dailyStreak: newStreak,
            lastActiveDate: new Date().toISOString().split("T")[0],
          },
          dailyQuests: dailyQuests.map((q) => ({
            ...q,
            progress: 0,
            completed: false,
          })),
        });
      },
    }),
    {
      name: "signlingo-gamification",
      partialize: (state) => ({
        userProgress: state.userProgress,
        badges: state.badges,
        rewards: state.rewards,
        dailyQuests: state.dailyQuests,
      }),
    }
  )
);
