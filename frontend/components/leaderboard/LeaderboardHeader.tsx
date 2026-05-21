"use client";

import { motion } from "framer-motion";
import { RefreshCw, Trophy, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils/formatNumber";
import { useTranslation } from "react-i18next";

interface LeaderboardHeaderProps {
  weeklyXp: number;
  challengeCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  reducedMotion?: boolean;
}

export function LeaderboardHeader({
  weeklyXp,
  challengeCount,
  isRefreshing,
  onRefresh,
  reducedMotion = false,
}: LeaderboardHeaderProps) {
  const { t, i18n } = useTranslation("leaderboard");
  const weekLabel = getWeekLabel(i18n.language);

  return (
    <motion.div
      initial={reducedMotion ? {} : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      {/* Title + meta */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={reducedMotion ? {} : { rotate: [0, -8, 8, 0] }}
          transition={{ duration: 1.2, delay: 0.6, ease: "easeInOut" }}
          className="p-3 rounded-2xl bg-primary/10"
        >
          <Trophy className="w-7 h-7 text-primary" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-foreground leading-none">
            {t("title")}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{weekLabel}</span>
            </div>
            {weeklyXp > 0 && (
              <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Zap className="w-3 h-3" />
                <span>{t("xpThisWeek", { xp: formatNumber(weeklyXp) })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {challengeCount > 0 && (
          <span className="hidden sm:inline text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            ⚔️ {t("challengesSent", { count: challengeCount })}
          </span>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
          aria-label={t("refreshLabel")}
        >
          <motion.span
            animate={
              isRefreshing && !reducedMotion
                ? { rotate: 360 }
                : { rotate: 0 }
            }
            transition={{
              duration: 0.6,
              ease: "linear",
              repeat: isRefreshing ? Infinity : 0,
            }}
            className="flex"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.span>
          {t("refresh")}
        </Button>
      </div>
    </motion.div>
  );
}

function getWeekLabel(language: string): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const locale = language === "ko" ? "ko-KR" : "en-US";
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}
