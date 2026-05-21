"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { ApiLeaderboardEntry } from "@/lib/api";
import i18n from "@/lib/i18n";

const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://signlingo-django.onrender.com"
    : "http://localhost:8000";

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  DEFAULT_API_URL;

// ============================================================
// TYPES
// ============================================================

export type LeaderboardView = "global" | "friends";

export interface LeaderboardEntry {
  id: string;
  rank: number;
  previousRank?: number;
  username: string;
  xp: number;
  weeklyXp?: number;
  avatarUrl?: string;
  countryCode?: string;
  isOnline: boolean;
  weeklyChange: "up" | "down" | "same";
  trendAmount?: number;
  isFriend: boolean;
  isCurrentUser: boolean;
  friendRequestSent?: boolean;
  badges?: string[];
}

export interface LeaderboardState {
  entries: LeaderboardEntry[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  view: LeaderboardView;
}

// ============================================================
// API LAYER — fetches from the Django backend
// ============================================================

// Module-level cache so page changes don't re-fetch unnecessarily.
let _globalCache: { entries: LeaderboardEntry[]; at: number } | null = null;
let _friendsCache: { entries: LeaderboardEntry[]; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

function mapEntry(e: ApiLeaderboardEntry): LeaderboardEntry {
  return {
    id: e.id,
    rank: e.rank,
    username: e.username,
    xp: e.xp,
    weeklyXp: e.weeklyXp,
    isOnline: e.isOnline,
    weeklyChange: e.weeklyChange,
    isFriend: e.isFriend,
    isCurrentUser: e.isCurrentUser,
  };
}

async function fetchAllEntries(type: "global" | "friends"): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_URL}/api/leaderboard?type=${type}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(i18n.t("leaderboard:errors.fetch"));
  const data = await res.json();
  return (data.entries as ApiLeaderboardEntry[]).map(mapEntry);
}

const PAGE_COUNT = 10; // kept for hasMore logic

async function fetchGlobalPage(
  page: number,
  pageSize: number,
  _currentUserId: string,
  _currentUserXp?: number
): Promise<{ entries: LeaderboardEntry[]; hasMore: boolean }> {
  const now = Date.now();
  if (!_globalCache || now - _globalCache.at > CACHE_TTL_MS) {
    _globalCache = { entries: await fetchAllEntries("global"), at: now };
  }
  const all = _globalCache.entries;
  const start = (page - 1) * pageSize;
  const entries = all.slice(start, start + pageSize);
  return { entries, hasMore: start + pageSize < all.length };
}

async function fetchFriendsPage(
  _currentUserId: string,
  _currentUserXp?: number
): Promise<LeaderboardEntry[]> {
  const now = Date.now();
  if (!_friendsCache || now - _friendsCache.at > CACHE_TTL_MS) {
    _friendsCache = { entries: await fetchAllEntries("friends"), at: now };
  }
  return _friendsCache.entries;
}

// ============================================================
// HOOK
// ============================================================

interface UseLeaderboardDataOptions {
  currentUserId: string;
  initialView?: LeaderboardView;
  pageSize?: number;
}

export function useLeaderboardData({
  currentUserId,
  initialView = "global",
  pageSize = 20,
}: UseLeaderboardDataOptions) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<LeaderboardView>(initialView);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [challengedUsers, setChallengedUsers] = useState<Set<string>>(new Set());
  const [challengeCount, setChallengeCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("signlingo_challenge_count") ?? "0", 10);
  });

  // Mutable ref so actions can read latest entries synchronously
  const entriesRef = useRef<LeaderboardEntry[]>([]);
  const currentUserXpRef = useRef<number | undefined>(undefined);
  const isInitialisedRef = useRef(false);

  function setEntriesSafe(next: LeaderboardEntry[]) {
    entriesRef.current = next;
    setEntries(next);
  }

  // ── initial load ──────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "global") {
        const { entries: e, hasMore: hm } = await fetchGlobalPage(
          1, pageSize, currentUserId, currentUserXpRef.current
        );
        setEntriesSafe(e);
        setHasMore(hm);
        setPage(1);
      } else {
        const e = await fetchFriendsPage(currentUserId, currentUserXpRef.current);
        setEntriesSafe(e);
        setHasMore(false);
      }
    } catch {
      setError(i18n.t("leaderboard:errors.load"));
    } finally {
      setLoading(false);
    }
  }, [view, pageSize, currentUserId]);

  // Run on mount and view change
  useState(() => {
    if (!isInitialisedRef.current) {
      isInitialisedRef.current = true;
      loadInitial();
    }
  });

  // ── load more (infinite scroll – global only) ─────────────
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || view !== "global") return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);
    try {
      const { entries: e, hasMore: hm } = await fetchGlobalPage(
        nextPage, pageSize, currentUserId, currentUserXpRef.current
      );
      setEntriesSafe([...entriesRef.current, ...e]);
      setHasMore(hm);
    } catch {
      setError(i18n.t("leaderboard:errors.loadMore"));
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, view, page, pageSize, currentUserId]);

  // ── switch view ───────────────────────────────────────────
  const switchView = useCallback((newView: LeaderboardView) => {
    if (newView === view) return;
    setView(newView);
    setEntriesSafe([]);
    setHasMore(true);
    setSearchQuery("");
    setLoading(true);
    setError(null);
    // Load immediately without waiting for effect
    (async () => {
      try {
        if (newView === "global") {
          const { entries: e, hasMore: hm } = await fetchGlobalPage(
            1, pageSize, currentUserId, currentUserXpRef.current
          );
          setEntriesSafe(e);
          setHasMore(hm);
          setPage(1);
        } else {
          const e = await fetchFriendsPage(currentUserId, currentUserXpRef.current);
          setEntriesSafe(e);
          setHasMore(false);
        }
      } catch {
        setError(i18n.t("leaderboard:errors.switchView"));
      } finally {
        setLoading(false);
      }
    })();
  }, [view, pageSize, currentUserId]);

  // ── refresh ───────────────────────────────────────────────
  const refresh = useCallback(async (): Promise<{ changedIds: string[] }> => {
    const prev = entriesRef.current;
    setLoading(true);
    setError(null);
    // Clear cache so next fetch goes to the network.
    _globalCache = null;
    _friendsCache = null;
    try {
      if (view === "global") {
        const { entries: freshEntries, hasMore: hm } = await fetchGlobalPage(
          1, pageSize, currentUserId, currentUserXpRef.current
        );
        const changedIds = freshEntries
          .filter((e) => {
            const old = prev.find((p) => p.id === e.id);
            return old && old.rank !== e.rank;
          })
          .map((e) => e.id);
        setEntriesSafe(freshEntries);
        setHasMore(hm);
        setPage(1);
        return { changedIds };
      } else {
        const freshEntries = await fetchFriendsPage(currentUserId, currentUserXpRef.current);
        setEntriesSafe(freshEntries);
        return { changedIds: [] };
      }
    } catch {
      setError(i18n.t("leaderboard:errors.refresh"));
      return { changedIds: [] };
    } finally {
      setLoading(false);
    }
  }, [view, pageSize, currentUserId]);

  // ── challenge user ────────────────────────────────────────
  const challengeUser = useCallback((userId: string) => {
    setChallengedUsers((prev) => new Set([...prev, userId]));
    const newCount = challengeCount + 1;
    setChallengeCount(newCount);
    if (typeof window !== "undefined") {
      localStorage.setItem("signlingo_challenge_count", String(newCount));
    }
  }, [challengeCount]);

  // ── add XP to current user & recalculate ranks ────────────
  const addXpToCurrentUser = useCallback(
    (amount: number): { changedIds: string[] } => {
      const current = entriesRef.current;
      const updated = current.map((e) =>
        e.isCurrentUser
          ? { ...e, xp: e.xp + amount, weeklyXp: (e.weeklyXp ?? 0) + amount }
          : e
      );
      const sorted = [...updated].sort((a, b) => b.xp - a.xp);
      const changedIds: string[] = [];
      const reRanked = sorted.map((e, idx) => {
        const newRank = idx + 1;
        if (newRank !== e.rank) changedIds.push(e.id);
        return { ...e, previousRank: e.rank, rank: newRank };
      });
      // Track new XP for subsequent fetches
      const me = reRanked.find((e) => e.isCurrentUser);
      if (me) currentUserXpRef.current = me.xp;
      setEntriesSafe(reRanked);
      return { changedIds };
    },
    []
  );

  // ── derived ───────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter((e) => e.username.toLowerCase().includes(q));
  }, [entries, searchQuery]);

  const currentUserEntry = useMemo(
    () => entries.find((e) => e.isCurrentUser) ?? null,
    [entries]
  );

  return {
    entries,
    filteredEntries,
    hasMore,
    loading,
    error,
    view,
    searchQuery,
    challengedUsers,
    challengeCount,
    currentUserEntry,
    setSearchQuery,
    switchView,
    loadMore,
    refresh,
    challengeUser,
    addXpToCurrentUser,
    retryLoad: loadInitial,
  };
}
