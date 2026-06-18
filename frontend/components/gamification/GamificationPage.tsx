"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { LevelCard } from "./LevelCard";
import { BadgesGrid } from "./BadgesGrid";
import { RewardsShop } from "./RewardsShop";
import { DailyQuests } from "./DailyQuests";
import { LevelUpModal } from "./LevelUpModal";
import { useGamificationStore, syncBadgesFromStats } from "./useGamificationStore";
import { AppHeader } from "@/components/app-header";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/store";
import { gamificationApi } from "@/lib/api";

interface GamificationPageProps {
  /** Optionally force reduced-motion (defaults to system preference). */
  reducedMotion?: boolean;
}

export function GamificationPage({
  reducedMotion: reducedMotionProp,
}: GamificationPageProps) {
  const [prefersReduced, setPrefersReduced] = useState(
    reducedMotionProp ?? false
  );

  const {
    userProgress,
    badges,
    newlyEarnedBadge,
    clearNewBadge,
    addXp,
    syncFromUser,
    resetDemo,
  } = useGamificationStore();
  const { user, refreshUser } = useAuthStore();
  const { t } = useTranslation("gamification");

  // Detect system reduced-motion preference
  useEffect(() => {
    if (reducedMotionProp !== undefined) {
      setPrefersReduced(reducedMotionProp);
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [reducedMotionProp]);

  // Show toast + clear when a badge is earned
  useEffect(() => {
    if (newlyEarnedBadge) {
      toast.success(
        t("badges.newBadgeToast", {
          name: t(`badges.items.${newlyEarnedBadge.id}.name`),
          icon: newlyEarnedBadge.icon,
        })
      );
      clearNewBadge();
    }
  }, [newlyEarnedBadge, clearNewBadge]);

  // Pull the latest server stats on entry so badges reflect activity done
  // elsewhere (lessons, quizzes, AI practice) since the last visit.
  useEffect(() => {
    void refreshUser();
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      syncFromUser(user);
      // Recompute badges from real stats so achievements reflect actual activity.
      syncBadgesFromStats({
        streak: user.dailyStreak,
        lessonsCompleted: user.lessonsCompleted,
        quizzesCompleted: user.quizzesCompleted,
        aiPractices: user.aiPracticesCompleted,
        league: user.league,
      });
    }
  }, [user, syncFromUser]);

  const handleAddXp = async (amount: number) => {
    // Optimistic local update (instant feedback + level-up animation).
    addXp(amount, "demo");
    try {
      // Persist to the backend so the XP survives navigation/reload, then pull
      // the authoritative value back (syncFromUser reconciles the store).
      await gamificationApi.addXp(amount);
      await refreshUser();
    } catch {
      // Network/auth error: keep the optimistic value; next sync will correct it.
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Toaster lives here so toasts work without a global provider */}
      <Toaster richColors position="top-right" />

      <AppHeader />

      {/* ── Page sub-header with demo controls ── */}
      <div className="border-b border-border bg-background/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>🎮</span>
            <h1 className="text-lg font-black text-foreground tracking-tight">{t("pageTitle")}</h1>
          </div>

          {/* Demo controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddXp(50)}
              aria-label={t("addXpSmallLabel")}
            >
              <Zap className="w-4 h-4 mr-1 text-primary" aria-hidden />
              {t("addXpBtn")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddXp(200)}
              aria-label={t("addXpLargeLabel")}
            >
              <Zap className="w-4 h-4 mr-1 text-amber-500" aria-hidden />
              {t("addXpLargeBtn")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                // Clear the local store immediately, then zero the server-side
                // state and re-sync so the reset survives navigation/reload.
                resetDemo();
                try {
                  await gamificationApi.resetProgress();
                  await refreshUser();
                } catch {
                  // Network/auth error: local reset stands; next sync reconciles.
                }
                toast.info(t("resetToast"));
              }}
              aria-label={t("resetLabel")}
              title={t("resetLabel")}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <motion.main
        initial={prefersReduced ? {} : { opacity: 0 }}
        animate={prefersReduced ? {} : { opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6"
        id="main-content"
      >
        {/* XP summary bar */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: -10 }}
          animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-primary/5 border border-primary/20"
        >
          <Trophy className="w-5 h-5 text-primary flex-shrink-0" aria-hidden />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {t("xpSummary.level", { level: userProgress.level })}
            </span>{" "}
            ·{" "}
            <span className="font-semibold text-primary">
              {userProgress.totalXp.toLocaleString()} XP
            </span>{" "}
            · {t("xpSummary.xpToNext", { xp: userProgress.xpToNextLevel })} ·{" "}
            <span className="text-orange-500 font-semibold">
              🔥 {t("xpSummary.streak", { days: userProgress.dailyStreak })}
            </span>
          </p>
        </motion.div>

        {/* Three-column grid (desktop) / stacked (mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Column 1: Level card + Daily quests ── */}
          <div className="flex flex-col gap-6">
            <LevelCard progress={userProgress} reducedMotion={prefersReduced} />
            <DailyQuests reducedMotion={prefersReduced} />
          </div>

          {/* ── Column 2: Badges grid ── */}
          <div className="lg:col-span-1">
            <BadgesGrid badges={badges} reducedMotion={prefersReduced} />
          </div>

          {/* ── Column 3: Rewards shop ── */}
          <div className="flex flex-col gap-6">
            <RewardsShop reducedMotion={prefersReduced} />

            {/* Quick XP progress reminder */}
            <motion.div
              initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
              animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-4 rounded-xl bg-muted/30 border border-border text-sm text-muted-foreground"
            >
              <p className="font-semibold text-foreground mb-1">
                {t("earnMore.title")}
              </p>
              <ul className="space-y-1 list-disc list-inside">
                {(t("earnMore.items", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </motion.main>

      {/* ── Level-up modal (rendered outside grid for z-index stacking) ── */}
      <LevelUpModal reducedMotion={prefersReduced} />
    </div>
  );
}
