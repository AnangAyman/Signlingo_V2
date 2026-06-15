"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Swords, UserPlus, Zap, Wifi } from "lucide-react";
import { formatNumber, formatOrdinal } from "@/lib/utils/formatNumber";
import type { LeaderboardEntry } from "./useLeaderboardData";
import { useTranslation } from "react-i18next";

interface UserProfileModalProps {
  user: LeaderboardEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onChallenge?: (userId: string) => void;
  onPractice?: (userId: string, xpAmount: number) => void;
  isChallenged?: boolean;
  isCurrentUser?: boolean;
  reducedMotion?: boolean;
}

const PRACTICE_AMOUNTS = [50, 100, 200] as const;

export function UserProfileModal({
  user,
  isOpen,
  onClose,
  onChallenge,
  onPractice,
  isChallenged = false,
  isCurrentUser = false,
  reducedMotion = false,
}: UserProfileModalProps) {
  const { t } = useTranslation("leaderboard");
  if (!user) return null;

  const leagueTier =
    user.xp >= 8_000
      ? "diamond"
      : user.xp >= 5_000
      ? "gold"
      : user.xp >= 2_500
      ? "silver"
      : "bronze";
  const league = t(`modal.leagues.${leagueTier}`);

  const leagueColor =
    leagueTier === "diamond"
      ? "text-cyan-500"
      : leagueTier === "gold"
      ? "text-yellow-500"
      : leagueTier === "silver"
      ? "text-slate-400"
      : "text-amber-600";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t("modal.profileLabel", { username: user.username })}
        >
          <motion.div
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { scale: 0.92, opacity: 0, y: 20 }
            }
            animate={
              reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { scale: 0.92, opacity: 0, y: 20 }
            }
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="relative w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label={t("modal.closeLabel")}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* ── Avatar + name ── */}
            <div className="text-center mb-5">
              <div className="relative inline-block mb-3">
                <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-xl">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <motion.span
                    animate={reducedMotion ? {} : { scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-card rounded-full"
                  />
                )}
              </div>

              <h3 className="text-xl font-bold text-foreground">
                {user.username}
                {isCurrentUser && ` (${t("modal.you")})`}
              </h3>

              <div className="flex items-center justify-center gap-2 mt-1">
                {user.isOnline ? (
                  <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                    <Wifi className="w-3 h-3" /> {t("modal.online")}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("modal.offline")}</span>
                )}
                {user.countryCode && (
                  <span className="text-xs text-muted-foreground">
                    · {user.countryCode}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {t("modal.globally", { rank: formatOrdinal(user.rank) })}
                </Badge>
                <Badge variant="outline" className={`text-xs ${leagueColor}`}>
                  {league}
                </Badge>
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: t("modal.totalXp"), value: formatNumber(user.xp) },
                {
                  label: t("modal.weeklyXp"),
                  value: user.weeklyXp ? formatNumber(user.weeklyXp) : "—",
                },
                { label: t("modal.rank"), value: `#${user.rank}` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="text-center p-3 rounded-xl bg-muted/50 border border-border/40"
                >
                  <p className="text-lg font-bold text-foreground leading-none">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Badges ── */}
            {user.badges && user.badges.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t("modal.badges")}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {user.badges.slice(0, 5).map((b, i) => (
                    <span
                      key={i}
                      className="text-2xl leading-none p-2 rounded-xl bg-muted/50 border border-border/40"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Practice (current user only) ── */}
            {isCurrentUser && onPractice && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t("modal.practiceSession")}
                </p>
                <div className="flex gap-2">
                  {PRACTICE_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 text-xs border-dashed"
                      onClick={() => onPractice(user.id, amt)}
                      aria-label={t("modal.practiceAmountLabel", { amount: amt })}
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      +{amt} XP
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {t("modal.practiceHelp")}
                </p>
              </div>
            )}

            {/* ── Actions (other users) ── */}
            {!isCurrentUser && (
              <div className="flex gap-3">
                {user.isFriend ? (
                  <Button
                    onClick={() => onChallenge?.(user.id)}
                    disabled={isChallenged}
                    className="flex-1 gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Swords className="w-4 h-4" />
                    {isChallenged ? t("modal.challengeSentBtn") : t("modal.challengeBtn")}
                  </Button>
                ) : (
                  <Button className="flex-1 gap-2">
                    <UserPlus className="w-4 h-4" />
                    {t("modal.addFriendBtn")}
                  </Button>
                )}
                <Button variant="outline" className="flex-1">
                  {t("modal.viewProfileBtn")}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
