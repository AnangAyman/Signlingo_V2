"use client";

import { useState, useCallback, useEffect } from "react";
import { Medal, Award, Trophy, Crown, Star } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { dashboardApi, leaderboardApi, type ApiLeaderboardEntry } from "@/lib/api";
import i18n from "@/lib/i18n";

// ============================================================
// TYPES
// ============================================================

export type LeagueTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface LeagueInfo {
  tier: LeagueTier;
  displayNameKey: string;
  minXp: number;
  maxXp: number;
  promotionRank: number;
  demotionRank: number;
  leagueSize: number;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  icon: typeof Medal;
  glowColor: string;
}

export interface UserLeagueStatus {
  userId: string;
  currentTier: LeagueTier;
  currentRank: number;
  weeklyXp: number;
  xpToNext: number;
  xpToAvoidDemotion: number;
  lastUpdated: Date;
  promotionDemotionState: "stable" | "promoting" | "demoting";
  streakDays: number;
}

export interface LeagueEvent {
  type: "promotion" | "demotion" | "rank_change";
  fromTier?: LeagueTier;
  toTier?: LeagueTier;
  newRank: number;
  timestamp: Date;
}

export interface LeagueParticipant {
  userId: string;
  username: string;
  avatar?: string;
  xp: number;
  rank: number;
  isCurrentUser?: boolean;
}

// ============================================================
// LEAGUE CONFIGURATIONS
// ============================================================

export const LEAGUES: Record<LeagueTier, LeagueInfo> = {
  bronze: {
    tier: "bronze",
    displayNameKey: "tiers.bronze.name",
    minXp: 0,
    maxXp: 500,
    promotionRank: 5,
    demotionRank: 26,
    leagueSize: 30,
    gradientFrom: "#CD7F32",
    gradientTo: "#8B4513",
    borderColor: "#CD7F32",
    icon: Medal,
    glowColor: "rgba(205, 127, 50, 0.4)",
  },
  silver: {
    tier: "silver",
    displayNameKey: "tiers.silver.name",
    minXp: 500,
    maxXp: 1500,
    promotionRank: 5,
    demotionRank: 26,
    leagueSize: 30,
    gradientFrom: "#C0C0C0",
    gradientTo: "#808080",
    borderColor: "#C0C0C0",
    icon: Award,
    glowColor: "rgba(192, 192, 192, 0.4)",
  },
  gold: {
    tier: "gold",
    displayNameKey: "tiers.gold.name",
    minXp: 1500,
    maxXp: 3000,
    promotionRank: 5,
    demotionRank: 26,
    leagueSize: 30,
    gradientFrom: "#FFD700",
    gradientTo: "#FFA500",
    borderColor: "#FFD700",
    icon: Trophy,
    glowColor: "rgba(255, 215, 0, 0.4)",
  },
  platinum: {
    tier: "platinum",
    displayNameKey: "tiers.platinum.name",
    minXp: 3000,
    maxXp: 5000,
    promotionRank: 3,
    demotionRank: 28,
    leagueSize: 30,
    gradientFrom: "#E5E4E2",
    gradientTo: "#A8A9AD",
    borderColor: "#E5E4E2",
    icon: Crown,
    glowColor: "rgba(229, 228, 226, 0.4)",
  },
  diamond: {
    tier: "diamond",
    displayNameKey: "tiers.diamond.name",
    minXp: 5000,
    maxXp: 10000,
    promotionRank: 1,
    demotionRank: 28,
    leagueSize: 30,
    gradientFrom: "#B9F2FF",
    gradientTo: "#00CED1",
    borderColor: "#B9F2FF",
    icon: Star,
    glowColor: "rgba(185, 242, 255, 0.5)",
  },
};

export const TIER_ORDER: LeagueTier[] = ["bronze", "silver", "gold", "platinum", "diamond"];

// ============================================================
// MOCK DATA GENERATORS
// ============================================================

const generateMockParticipants = (
  currentUserId: string,
  leagueSize: number,
  userRank: number,
  userXp: number
): LeagueParticipant[] => {
  const participants: LeagueParticipant[] = [];
  const names = [
    "SignMaster", "HandsUp", "GestureGuru", "SignPro", "FingerSpell",
    "QuietVoice", "SignStar", "ASLKing", "HandWave", "MuteHero",
    "SignNinja", "GestureQueen", "ASLWizard", "SilentStorm", "HandTalk",
    "SignChamp", "FingerDance", "QuietHero", "GestureKing", "ASLMaster",
    "SignLegend", "HandPro", "MuteMaster", "SignWiz", "GesturePro",
    "ASLHero", "SignKing", "HandMaster", "QuietStar", "GestureLegend",
  ];

  for (let i = 1; i <= leagueSize; i++) {
    if (i === userRank) {
      participants.push({
        userId: currentUserId,
        username: "You",
        xp: userXp,
        rank: i,
        isCurrentUser: true,
      });
    } else {
      const baseXp = Math.max(0, userXp + (userRank - i) * 50 + Math.floor(Math.random() * 30) - 15);
      participants.push({
        userId: `user_${i}`,
        username: names[(i - 1) % names.length] + (i > names.length ? i : ""),
        xp: baseXp,
        rank: i,
      });
    }
  }

  return participants.sort((a, b) => b.xp - a.xp).map((p, idx) => ({ ...p, rank: idx + 1 }));
};

// ============================================================
// MOCK API FUNCTIONS
// ============================================================

function normalizeTier(tier: string | undefined): LeagueTier {
  const normalized = (tier || "bronze").toLowerCase();
  return TIER_ORDER.includes(normalized as LeagueTier)
    ? (normalized as LeagueTier)
    : "bronze";
}

function mapLeaderboardEntry(entry: ApiLeaderboardEntry): LeagueParticipant {
  return {
    userId: entry.id,
    username: entry.username,
    xp: entry.weeklyXp ?? entry.xp,
    rank: entry.rank,
    isCurrentUser: entry.isCurrentUser,
  };
}

const fetchLeagueSnapshot = async (
  userId: string
): Promise<{ status: UserLeagueStatus; participants: LeagueParticipant[] }> => {
  // Use the Django API as the source of truth when the integrated backend is available.
  const [dashboard, leaderboard] = await Promise.all([
    dashboardApi.get(),
    leaderboardApi.get("global"),
  ]);

  const tier = normalizeTier(dashboard.user.league);
  const leagueInfo = LEAGUES[tier];
  const currentEntry =
    leaderboard.entries.find((entry) => entry.isCurrentUser) ||
    leaderboard.entries.find((entry) => entry.id === userId);

  const userXp = currentEntry?.weeklyXp ?? dashboard.user.xp;
  return {
    status: {
      userId,
      currentTier: tier,
      currentRank: currentEntry?.rank ?? dashboard.rank ?? 1,
      weeklyXp: userXp,
      xpToNext: Math.max(0, leagueInfo.maxXp - dashboard.user.xp),
      xpToAvoidDemotion: 0,
      lastUpdated: new Date(),
      promotionDemotionState: "stable",
      streakDays: dashboard.currentStreak,
    },
    participants: leaderboard.entries.map(mapLeaderboardEntry),
  };
};

// ============================================================
// CUSTOM HOOK
// ============================================================

interface UseLeagueDataOptions {
  userId: string;
  onPromotion?: (event: LeagueEvent) => void;
  onDemotion?: (event: LeagueEvent) => void;
}

export function useLeagueData({ userId, onPromotion, onDemotion }: UseLeagueDataOptions) {
  const [status, setStatus] = useState<UserLeagueStatus | null>(null);
  const [participants, setParticipants] = useState<LeagueParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [showDemotionTooltip, setShowDemotionTooltip] = useState(false);
  const [leagueHistory, setLeagueHistory] = useLocalStorage<LeagueEvent[]>(
    `signlingo-league-history-${userId}`,
    []
  );
  const [lastResetDate, setLastResetDate] = useLocalStorage<string>(
    `signlingo-last-reset-${userId}`,
    ""
  );

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchLeagueSnapshot(userId);
      setStatus(data.status);
      
      const leagueInfo = LEAGUES[data.status.currentTier];
      const apiParticipants = data.participants.length
        ? data.participants
        : generateMockParticipants(
            userId,
            leagueInfo.leagueSize,
            data.status.currentRank,
            data.status.weeklyXp
          );
      setParticipants(apiParticipants);
      
      // Check for demotion risk
      if (data.status.currentRank >= leagueInfo.demotionRank) {
        setShowDemotionTooltip(true);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error(i18n.t("leagues:failedToLoad"))
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add XP and check for promotion
  const addXp = useCallback(
    async (amount: number) => {
      if (!status) return;

      const newXp = status.weeklyXp + amount;
      const leagueInfo = LEAGUES[status.currentTier];
      const tierIndex = TIER_ORDER.indexOf(status.currentTier);

      // Check for promotion
      if (newXp >= leagueInfo.maxXp && tierIndex < TIER_ORDER.length - 1) {
        const newTier = TIER_ORDER[tierIndex + 1];
        const event: LeagueEvent = {
          type: "promotion",
          fromTier: status.currentTier,
          toTier: newTier,
          newRank: 1,
          timestamp: new Date(),
        };

        setLeagueHistory((prev) => [...prev, event]);
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                currentTier: newTier,
                weeklyXp: newXp - leagueInfo.maxXp,
                xpToNext: LEAGUES[newTier].maxXp - (newXp - leagueInfo.maxXp),
                promotionDemotionState: "promoting",
                currentRank: 1,
              }
            : null
        );
        setShowPromotionModal(true);
        onPromotion?.(event);
      } else {
        // Update XP and recalculate rank
        const updatedParticipants = participants.map((p) =>
          p.isCurrentUser ? { ...p, xp: newXp } : p
        );
        const sorted = updatedParticipants.sort((a, b) => b.xp - a.xp);
        const newRank = sorted.findIndex((p) => p.isCurrentUser) + 1;

        setStatus((prev) =>
          prev
            ? {
                ...prev,
                weeklyXp: newXp,
                xpToNext: leagueInfo.maxXp - newXp,
                currentRank: newRank,
              }
            : null
        );
        setParticipants(sorted.map((p, idx) => ({ ...p, rank: idx + 1 })));
      }
    },
    [status, participants, onPromotion, setLeagueHistory]
  );

  // Simulate week end (for testing)
  const simulateWeekEnd = useCallback(() => {
    if (!status) return;

    const leagueInfo = LEAGUES[status.currentTier];
    const tierIndex = TIER_ORDER.indexOf(status.currentTier);

    // Check demotion
    if (status.currentRank >= leagueInfo.demotionRank && tierIndex > 0) {
      const newTier = TIER_ORDER[tierIndex - 1];
      const event: LeagueEvent = {
        type: "demotion",
        fromTier: status.currentTier,
        toTier: newTier,
        newRank: 1,
        timestamp: new Date(),
      };

      setLeagueHistory((prev) => [...prev, event]);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              currentTier: newTier,
              weeklyXp: 0,
              xpToNext: LEAGUES[newTier].maxXp,
              promotionDemotionState: "demoting",
              currentRank: 15,
            }
          : null
      );
      onDemotion?.(event);
    } else if (status.currentRank <= leagueInfo.promotionRank && tierIndex < TIER_ORDER.length - 1) {
      // Promotion
      const newTier = TIER_ORDER[tierIndex + 1];
      const event: LeagueEvent = {
        type: "promotion",
        fromTier: status.currentTier,
        toTier: newTier,
        newRank: 25,
        timestamp: new Date(),
      };

      setLeagueHistory((prev) => [...prev, event]);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              currentTier: newTier,
              weeklyXp: 0,
              xpToNext: LEAGUES[newTier].maxXp,
              promotionDemotionState: "promoting",
              currentRank: 25,
            }
          : null
      );
      setShowPromotionModal(true);
      onPromotion?.(event);
    } else {
      // Reset for new week
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              weeklyXp: 0,
              xpToNext: leagueInfo.maxXp,
              currentRank: Math.floor(Math.random() * 15) + 10,
            }
          : null
      );
    }

    setLastResetDate(new Date().toISOString());
    
    // Regenerate participants
    if (status) {
      const newParticipants = generateMockParticipants(
        userId,
        leagueInfo.leagueSize,
        Math.floor(Math.random() * 15) + 10,
        0
      );
      setParticipants(newParticipants);
    }
  }, [status, userId, onPromotion, onDemotion, setLeagueHistory, setLastResetDate]);

  // Close promotion modal
  const closePromotionModal = useCallback(() => {
    setShowPromotionModal(false);
    setStatus((prev) =>
      prev ? { ...prev, promotionDemotionState: "stable" } : null
    );
  }, []);

  // Dismiss demotion tooltip
  const dismissDemotionTooltip = useCallback(() => {
    setShowDemotionTooltip(false);
  }, []);

  return {
    status,
    participants,
    loading,
    error,
    showPromotionModal,
    showDemotionTooltip,
    leagueHistory,
    lastResetDate,
    addXp,
    simulateWeekEnd,
    closePromotionModal,
    dismissDemotionTooltip,
    refetch: fetchData,
    leagues: LEAGUES,
    tierOrder: TIER_ORDER,
  };
}
