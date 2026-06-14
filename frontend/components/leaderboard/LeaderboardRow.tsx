"use client";

import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Swords,
  UserPlus,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { formatNumber } from "@/lib/utils/formatNumber";
import type { LeaderboardEntry } from "./useLeaderboardData";
import { useTranslation } from "react-i18next";

// ── podium colours (all class strings are literals – safe for Tailwind scan) ──
const PODIUM_RANK_BG = [
  "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30",
  "bg-gradient-to-br from-slate-300 to-slate-400 text-gray-800 shadow-lg shadow-slate-400/30",
  "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30",
];
const PODIUM_CROWN = ["👑", "🥈", "🥉"];
const PODIUM_NAME_TEXT = [
  "text-amber-600 dark:text-amber-400 font-bold",
  "text-slate-500 dark:text-slate-300 font-bold",
  "text-amber-700 dark:text-amber-500 font-bold",
];
const PODIUM_ROW_BG = [
  "bg-amber-500/5 border border-amber-400/30",
  "bg-slate-400/5 border border-slate-300/30",
  "bg-amber-600/5 border border-amber-600/30",
];

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  onChallenge?: (userId: string) => void;
  onUserClick?: (userId: string) => void;
  isChallenged?: boolean;
  reducedMotion?: boolean;
  index: number;
  rankChangeActive?: boolean;
}

function LeaderboardRowComponent({
  entry,
  onChallenge,
  onUserClick,
  isChallenged = false,
  reducedMotion = false,
  index,
  rankChangeActive = false,
}: LeaderboardRowProps) {
  const { t } = useTranslation("leaderboard");
  const [isFlashing, setIsFlashing] = useState(false);
  const [showArrow, setShowArrow] = useState(false);

  const isPodium = entry.rank >= 1 && entry.rank <= 3;
  const podiumIdx = entry.rank - 1; // 0, 1, 2
  const rankChanged =
    entry.previousRank !== undefined && entry.previousRank !== entry.rank;
  const movedUp =
    entry.previousRank !== undefined && entry.previousRank > entry.rank;

  // Trigger flash + arrow when rank changes
  useEffect(() => {
    if (rankChangeActive && rankChanged && !reducedMotion) {
      setIsFlashing(true);
      setShowArrow(true);
      const flash = setTimeout(() => setIsFlashing(false), 700);
      const arrow = setTimeout(() => setShowArrow(false), 3200);
      return () => {
        clearTimeout(flash);
        clearTimeout(arrow);
      };
    }
  }, [rankChangeActive, rankChanged, reducedMotion]);

  // ── rank badge ────────────────────────────────────────────
  const rankBadgeClass = entry.isCurrentUser
    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
    : isPodium
    ? PODIUM_RANK_BG[podiumIdx]
    : "bg-muted text-muted-foreground";

  // ── row background ────────────────────────────────────────
  const rowBgClass = entry.isCurrentUser
    ? "bg-primary/10 border border-primary/20"
    : isPodium
    ? PODIUM_ROW_BG[podiumIdx]
    : "";

  // ── username text ─────────────────────────────────────────
  const nameClass = entry.isCurrentUser
    ? "text-primary font-semibold"
    : isPodium
    ? PODIUM_NAME_TEXT[podiumIdx]
    : "text-foreground font-medium group-hover:text-primary transition-colors";

  return (
    <motion.div
      layout
      initial={reducedMotion ? {} : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.28 }}
      onClick={() => onUserClick?.(entry.id)}
      role="row"
      aria-label={t("rankLabel", { rank: entry.rank, username: entry.username, xp: formatNumber(entry.xp) })}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onUserClick?.(entry.id)}
      className={`
        relative grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto]
        items-center gap-3 p-3 rounded-xl cursor-pointer select-none
        transition-all duration-200 group
        hover:ring-1 hover:ring-primary/20 hover:shadow-md hover:shadow-primary/5
        ${rowBgClass}
        ${!entry.isCurrentUser && !isPodium ? "hover:bg-muted/60" : ""}
      `}
    >
      {/* ── rank-change flash overlay ── */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 rounded-xl bg-amber-400/25 pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      {/* ── rank badge ── */}
      <motion.div
        animate={
          isFlashing && !reducedMotion
            ? { scale: [1, 1.4, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.4 }}
        className={`
          relative w-10 h-10 rounded-full flex items-center justify-center
          text-sm shrink-0 font-bold ${rankBadgeClass}
        `}
      >
        {isPodium ? (
          <span className="text-base leading-none">{PODIUM_CROWN[podiumIdx]}</span>
        ) : (
          entry.rank
        )}

        {/* Arrow indicator for rank change */}
        <AnimatePresence>
          {showArrow && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: movedUp ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.4 }}
              className={`
                absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
                flex items-center justify-center z-10
                ${movedUp ? "bg-green-500" : "bg-destructive"}
              `}
            >
              {movedUp ? (
                <ChevronUp className="w-2.5 h-2.5 text-white" />
              ) : (
                <ChevronDown className="w-2.5 h-2.5 text-white" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── user info ── */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Avatar with online pulse */}
        <div className="relative shrink-0">
          <Avatar className="w-9 h-9">
            <AvatarImage src={entry.avatarUrl} />
            <AvatarFallback
              className={`text-xs ${
                entry.isCurrentUser
                  ? "bg-primary text-primary-foreground"
                  : isPodium
                  ? "bg-muted-foreground text-background"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {entry.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {entry.isOnline && (
            <motion.span
              animate={
                reducedMotion
                  ? {}
                  : { scale: [1, 1.65, 1], opacity: [1, 0.35, 1] }
              }
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              title={t("onlineTitle")}
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"
            />
          )}
        </div>

        {/* Name + badges + country */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm truncate ${nameClass}`}>
              {entry.username}
              {entry.isCurrentUser && ` (${t("modal.you")})`}
            </span>
            {entry.badges?.slice(0, 2).map((b, i) => (
              <span key={i} className="text-sm leading-none" aria-hidden="true">
                {b}
              </span>
            ))}
          </div>
          {entry.countryCode && (
            <p className="text-xs text-muted-foreground hidden md:block">
              {entry.countryCode}
            </p>
          )}
        </div>
      </div>

      {/* ── weekly change (desktop only) ── */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        {entry.weeklyChange === "up" ? (
          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
        ) : entry.weeklyChange === "down" ? (
          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {entry.trendAmount !== undefined && entry.trendAmount > 0 && (
          <span
            className={`text-xs font-medium ${
              entry.weeklyChange === "up"
                ? "text-green-500"
                : entry.weeklyChange === "down"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {entry.weeklyChange === "up" ? "+" : entry.weeklyChange === "down" ? "-" : ""}
            {entry.trendAmount}
          </span>
        )}
      </div>

      {/* ── best game score (Magic Touch) ── */}
      {entry.bestGameScore != null && entry.bestGameScore > 0 && (
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-foreground">
            {formatNumber(entry.bestGameScore)}
          </p>
          <p className="text-xs text-muted-foreground" aria-label="game score">🎈</p>
        </div>
      )}

      {/* ── XP ── */}
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-bold ${
            entry.isCurrentUser
              ? "text-primary"
              : isPodium
              ? PODIUM_NAME_TEXT[podiumIdx]
              : "text-foreground"
          }`}
        >
          {formatNumber(entry.xp)}
        </p>
        <p className="text-xs text-muted-foreground">{t("xpLabel")}</p>
      </div>

      {/* ── action button ── */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        {!entry.isCurrentUser &&
          (entry.isFriend ? (
            <Button
              size="sm"
              variant={isChallenged ? "secondary" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                onChallenge?.(entry.id);
              }}
              disabled={isChallenged}
              className="h-8 px-3"
              aria-label={
                isChallenged
                  ? t("challengeSent")
                  : t("challengeUserLabel", { username: entry.username })
              }
            >
              {isChallenged ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">{t("sent")}</span>
                </>
              ) : (
                <>
                  <Swords className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">{t("challenge")}</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={t("addFriend", { username: entry.username })}
              onClick={(e) => e.stopPropagation()}
            >
              <UserPlus className="w-3.5 h-3.5" />
            </Button>
          ))}
      </div>
    </motion.div>
  );
}

export const LeaderboardRow = memo(LeaderboardRowComponent);
