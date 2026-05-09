// ============================================================
// MOCK DATA GENERATORS – pure, deterministic, no hooks
// ============================================================

import type { LeaderboardEntry } from "./useLeaderboardData";

export const USERNAMES = [
  "SignMaster", "HandsUp", "GestureGuru", "SignPro", "FingerSpell",
  "QuietVoice", "SignStar", "ASLKing", "HandWave", "MuteHero",
  "SignNinja", "GestureQueen", "ASLWizard", "SilentStorm", "HandTalk",
  "SignChamp", "FingerDance", "QuietHero", "GestureKing", "ASLMaster",
  "SignLegend", "HandPro", "MuteMaster", "SignWiz", "GesturePro",
  "ASLHero", "SignKing", "HandMaster", "QuietStar", "GestureLegend",
  "DeafPride", "SignFlow", "HandHero", "MuteWizard", "SignAce",
  "GestureAce", "ASLNinja", "SignBeast", "HandDancer", "QuietForce",
  "SilentAce", "FingerPro", "SignWarrior", "HandChamp", "MuteKing",
  "SignViper", "HandFlash", "DeafFury", "SilentBolt", "SignPulse",
];

export const COUNTRIES = [
  "US", "GB", "CA", "AU", "DE", "FR", "JP", "KR",
  "BR", "MX", "IN", "NL", "SE", "NO", "ES", "IT",
];

export const EMOJI_BADGES = [
  "🔥", "⭐", "🏆", "💎", "⚡", "🎯", "🌟",
  "🥊", "👑", "🎖️", "🏅", "✨", "🚀", "💫",
];

/** Current user's initial rank in the global leaderboard */
export const CURRENT_USER_RANK = 12;

// Deterministic pseudo-random from seed (consistent across renders)
function seeded(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function name(rank: number): string {
  const base = USERNAMES[(rank - 1) % USERNAMES.length];
  const suffix = rank > USERNAMES.length ? `${Math.floor((rank - 1) / USERNAMES.length)}` : "";
  return base + suffix;
}

/**
 * Generate a page of global leaderboard entries.
 * @param page        1-based page number
 * @param pageSize    entries per page
 * @param currentUserId  used to tag the current user's row
 * @param currentUserXp  override XP for current user (for practice simulation)
 */
export function generateGlobalEntries(
  page: number,
  pageSize: number,
  currentUserId: string,
  currentUserXp?: number
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  const startRank = (page - 1) * pageSize + 1;

  for (let i = 0; i < pageSize; i++) {
    const rank = startRank + i;
    const s = rank * 17;
    const isCurrentUser = rank === CURRENT_USER_RANK;

    // XP: 10 000 at rank 1, exponential decay
    const baseXp = Math.round(10_000 * Math.pow(0.983, rank - 1));
    const jitter = Math.round((seeded(s) - 0.5) * 80);
    const xp =
      isCurrentUser && currentUserXp !== undefined
        ? currentUserXp
        : Math.max(baseXp + jitter, 100);

    const weeklyXp = Math.round(seeded(s + 100) * 700 + 80);

    // Simulated rank change since last week
    const delta = Math.round((seeded(s + 200) - 0.5) * 8); // -4 to +4
    const previousRank = Math.max(1, rank + delta);
    const weeklyChange: "up" | "down" | "same" =
      previousRank > rank ? "up" : previousRank < rank ? "down" : "same";
    const trendAmount = Math.abs(delta);

    const badgeCount = Math.floor(seeded(s + 300) * 3);
    const badges = Array.from({ length: badgeCount }, (_, bi) =>
      EMOJI_BADGES[Math.floor(seeded(s + 400 + bi) * EMOJI_BADGES.length)]
    );

    entries.push({
      id: isCurrentUser ? currentUserId : `global_${rank}`,
      rank,
      previousRank,
      username: isCurrentUser ? "You" : name(rank),
      xp,
      weeklyXp,
      countryCode: COUNTRIES[Math.floor(seeded(s + 500) * COUNTRIES.length)],
      isOnline: seeded(s + 600) > 0.65,
      weeklyChange,
      trendAmount,
      isFriend: !isCurrentUser && seeded(s + 700) > 0.87,
      isCurrentUser,
      badges: badges.length > 0 ? badges : undefined,
    });
  }

  return entries;
}

/**
 * Generate the friends leaderboard (20 entries including current user).
 */
export function generateFriendsEntries(
  currentUserId: string,
  currentUserXp = 1_750
): LeaderboardEntry[] {
  const friends: LeaderboardEntry[] = [];

  for (let i = 0; i < 19; i++) {
    const s = i * 31 + 7;
    const xp = Math.round(seeded(s) * 4_500 + 300);
    const weeklyXp = Math.round(seeded(s + 100) * 500 + 50);
    const delta = Math.round((seeded(s + 300) - 0.5) * 6);

    friends.push({
      id: `friend_${i}`,
      rank: 0,
      previousRank: 0,
      username: USERNAMES[i % USERNAMES.length],
      xp,
      weeklyXp,
      countryCode: COUNTRIES[i % COUNTRIES.length],
      isOnline: seeded(s + 200) > 0.3, // ~70 % online
      weeklyChange: delta > 0 ? "up" : delta < 0 ? "down" : "same",
      trendAmount: Math.abs(delta),
      isFriend: true,
      isCurrentUser: false,
      friendRequestSent: seeded(i * 31 + 600) > 0.6,
      badges:
        seeded(i * 31 + 700) > 0.5
          ? [EMOJI_BADGES[i % EMOJI_BADGES.length]]
          : undefined,
    });
  }

  // Current user entry
  friends.push({
    id: currentUserId,
    rank: 0,
    previousRank: 0,
    username: "You",
    xp: currentUserXp,
    weeklyXp: 320,
    isOnline: true,
    weeklyChange: "up",
    trendAmount: 3,
    isFriend: false,
    isCurrentUser: true,
    badges: ["🔥", "⭐"],
  });

  // Sort by XP, assign ranks and simulated previousRank
  return friends
    .sort((a, b) => b.xp - a.xp)
    .map((f, idx) => ({
      ...f,
      rank: idx + 1,
      previousRank: Math.max(
        1,
        idx + 1 + Math.round((seeded(idx * 7 + 999) - 0.5) * 4)
      ),
    }));
}
