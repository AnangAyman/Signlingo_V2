"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, UserPlus, Zap } from "lucide-react";

import { LeaderboardHeader } from "./LeaderboardHeader";
import { SegmentedControl } from "./SegmentedControl";
import { LeaderboardRow } from "./LeaderboardRow";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";
import { UserProfileModal } from "./UserProfileModal";
import { useLeaderboardData, type LeaderboardEntry } from "./useLeaderboardData";
import { useTranslation } from "react-i18next";

// ============================================================
// PROPS
// ============================================================

interface LeaderboardProps {
  currentUserId: string;
  initialView?: "global" | "friends";
  onChallengeFriend?: (friendId: string) => void;
  onUserClick?: (userId: string) => void;
  pageSize?: number;
}

// ============================================================
// COMPONENT
// ============================================================

export default function Leaderboard({
  currentUserId,
  initialView = "global",
  onChallengeFriend,
  onUserClick,
  pageSize = 20,
}: LeaderboardProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const { t } = useTranslation("leaderboard");
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rankChangedIds, setRankChangedIds] = useState<Set<string>>(new Set());

  // Track previous rank for confetti trigger
  const prevUserRankRef = useRef<number | null>(null);

  const {
    filteredEntries,
    entries,
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
    retryLoad,
  } = useLeaderboardData({ currentUserId, initialView, pageSize });

  // ── infinite scroll ───────────────────────────────────────
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "150px",
  });

  useEffect(() => {
    if (inView && hasMore && !loading && view === "global") loadMore();
  }, [inView, hasMore, loading, view, loadMore]);

  // ── reduced-motion ────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── top-10 confetti ───────────────────────────────────────
  useEffect(() => {
    if (!currentUserEntry || reducedMotion) return;
    const newRank = currentUserEntry.rank;
    const prev = prevUserRankRef.current;
    if (prev !== null && prev > 10 && newRank <= 10) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { x: 0.5, y: 0.5 },
        colors: ["#6366f1", "#f59e0b", "#14b8a6", "#ec4899"],
      });
      toast.success(t("top10Toast"), { duration: 4500 });
    }
    prevUserRankRef.current = newRank;
  }, [currentUserEntry, reducedMotion]);

  // ── clear rank-change highlights after animation ──────────
  useEffect(() => {
    if (rankChangedIds.size === 0) return;
    const t = setTimeout(() => setRankChangedIds(new Set()), 4000);
    return () => clearTimeout(t);
  }, [rankChangedIds]);

  // ── refresh ───────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const { changedIds } = await refresh();
    setRankChangedIds(new Set(changedIds));
    setIsRefreshing(false);
  }, [refresh]);

  // ── challenge ─────────────────────────────────────────────
  const handleChallenge = useCallback(
    (userId: string) => {
      const user = entries.find((e) => e.id === userId);
      if (!user) return;
      challengeUser(userId);
      toast.success(t("challengeSentToast", { username: user.username }));
      onChallengeFriend?.(userId);
      if (user.isOnline && !reducedMotion) {
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { x: 0.5, y: 0.65 },
          colors: ["#6366f1", "#f59e0b", "#14b8a6"],
        });
      }
    },
    [challengeUser, entries, onChallengeFriend, reducedMotion]
  );

  // ── practice XP ──────────────────────────────────────────
  const handlePractice = useCallback(
    (_userId: string, amount: number) => {
      const { changedIds } = addXpToCurrentUser(amount);
      setRankChangedIds(new Set(changedIds));
      toast.success(t("xpEarnedToast", { amount }));
    },
    [addXpToCurrentUser]
  );

  // ── user row click ────────────────────────────────────────
  const handleUserClick = useCallback(
    (userId: string) => {
      const user = entries.find((e) => e.id === userId);
      if (user) {
        setSelectedUser(user);
        onUserClick?.(userId);
      }
    },
    [entries, onUserClick]
  );

  // ── row stagger container ─────────────────────────────────
  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.03 } },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <LeaderboardHeader
        weeklyXp={currentUserEntry?.weeklyXp ?? 0}
        challengeCount={challengeCount}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        reducedMotion={reducedMotion}
      />

      {/* View toggle */}
      <SegmentedControl
        value={view}
        onChange={switchView}
        reducedMotion={reducedMotion}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-10 pr-10 bg-muted/50"
          aria-label={t("searchPlaceholder")}
        />
        <AnimatePresence>
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label={t("clearSearch")}
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Debug: +50 XP button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {view === "global"
            ? t("globalCount", { count: Math.min(entries.length, 200) })
            : t("friendsCount", { count: entries.length })}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs border-dashed"
          onClick={() => handlePractice(currentUserId, 50)}
          aria-label={t("addXpLabel")}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          {t("addXpBtn")}
        </Button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="p-6 text-center rounded-xl border border-destructive/20 bg-destructive/5">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <Button onClick={retryLoad} variant="outline" size="sm">
            {t("retry")}
          </Button>
        </div>
      )}

      {/* ── Empty: no friends ── */}
      {!loading && !error && filteredEntries.length === 0 && view === "friends" && !searchQuery && (
        <div className="py-16 text-center space-y-4">
          <div className="text-5xl">🤝</div>
          <h3 className="text-lg font-semibold">{t("noFriendsTitle")}</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {t("noFriendsMessage")}
          </p>
          <Button size="sm" className="gap-2">
            <UserPlus className="w-4 h-4" />
            {t("inviteFriends")}
          </Button>
        </div>
      )}

      {/* ── Empty: search no results ── */}
      {!loading && !error && filteredEntries.length === 0 && searchQuery && (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-sm text-muted-foreground">
            {t("noResults", { query: searchQuery })}
          </p>
        </div>
      )}

      {/* ── List ── */}
      {!error && (filteredEntries.length > 0 || loading) && (
        <>
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-1.5"
          >
            <AnimatePresence mode="popLayout">
              {filteredEntries.map((entry, index) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  onChallenge={handleChallenge}
                  onUserClick={handleUserClick}
                  isChallenged={challengedUsers.has(entry.id)}
                  reducedMotion={reducedMotion}
                  index={index}
                  rankChangeActive={rankChangedIds.has(entry.id)}
                />
              ))}
            </AnimatePresence>

            {/* Skeleton while loading */}
            {loading && (
              <LeaderboardSkeleton count={5} reducedMotion={reducedMotion} />
            )}

            {/* Infinite scroll sentinel */}
            {view === "global" && hasMore && !loading && (
              <div ref={loadMoreRef} className="py-5 flex justify-center">
                <div className="flex items-center gap-1.5">
                  {[0, 0.12, 0.24].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={
                        reducedMotion ? {} : { y: [0, -5, 0] }
                      }
                      transition={{
                        duration: 0.7,
                        delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* End of list */}
            {!hasMore && filteredEntries.length > 0 && !searchQuery && (
              <div className="py-6 text-center">
                <Badge variant="secondary" className="text-xs">
                  {t("endOfList")}
                </Badge>
              </div>
            )}
          </motion.div>

          {/* Sticky "Your rank" pill – shown when current user is not visible */}
          {currentUserEntry && !filteredEntries.find((e) => e.isCurrentUser) && (
            <div className="sticky bottom-4 flex justify-center pointer-events-none">
              <div className="pointer-events-auto rounded-full bg-primary/95 text-primary-foreground px-4 py-2 text-sm font-semibold shadow-lg shadow-primary/30 flex items-center gap-2">
                <span>{t("yourRank", { rank: currentUserEntry.rank })}</span>
                <span className="opacity-75">·</span>
                <span>{(currentUserEntry.xp ?? 0).toLocaleString()} XP</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Profile modal */}
      <UserProfileModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onChallenge={handleChallenge}
        onPractice={handlePractice}
        isChallenged={
          selectedUser ? challengedUsers.has(selectedUser.id) : false
        }
        isCurrentUser={selectedUser?.id === currentUserId}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
