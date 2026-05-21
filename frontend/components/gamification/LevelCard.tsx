"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Zap, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/utils/formatNumber";
import type { UserProgress } from "./useGamificationStore";
import { useTranslation } from "react-i18next";

interface LevelCardProps {
  progress: UserProgress;
  reducedMotion?: boolean;
}

export function LevelCard({ progress, reducedMotion = false }: LevelCardProps) {
  const { t } = useTranslation("gamification");
  const [displayedXp, setDisplayedXp] = useState(progress.totalXp);
  const prevXpRef = useRef(progress.totalXp);

  // Animate XP changes
  useEffect(() => {
    if (reducedMotion || prevXpRef.current === progress.totalXp) return;

    const startXp = prevXpRef.current;
    const endXp = progress.totalXp;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentXp = Math.round(startXp + (endXp - startXp) * eased);

      setDisplayedXp(currentXp);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevXpRef.current = progress.totalXp;
  }, [progress.totalXp, reducedMotion]);

  const handleCelebrate = () => {
    if (reducedMotion) return;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#F5C242", "#8B5CF6", "#EC4899"],
    });
  };

  // SVG circle calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress.levelProgressPercent / 100) * circumference;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-6">
        <CardContent className="p-0 text-center">
          {/* Circular Progress */}
          <div className="relative w-44 h-44 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted"
              />
              {/* Progress circle */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
              </defs>
            </svg>

            {/* Level Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-4xl font-bold text-foreground"
                key={progress.level}
                initial={reducedMotion ? {} : { scale: 1.5, opacity: 0 }}
                animate={reducedMotion ? {} : { scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 10 }}
              >
                {progress.level}
              </motion.span>
              <span className="text-sm text-muted-foreground">{t("levelCard.levelLabel")}</span>
            </div>
          </div>

          {/* XP Display */}
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                {formatNumber(displayedXp)}
              </span>
              <span className="text-muted-foreground">{t("levelCard.xpLabel")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("levelCard.xpToNext", { xp: formatNumber(progress.xpToNextLevel), level: progress.level + 1 })}
            </p>
          </div>

          {/* Streak Banner */}
          {progress.dailyStreak >= 7 ? (
            <motion.div
              initial={reducedMotion ? {} : { scale: 0.9, opacity: 0 }}
              animate={reducedMotion ? {} : { scale: 1, opacity: 1 }}
              className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-3 mb-4 border border-orange-500/30"
            >
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  animate={reducedMotion ? {} : { scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Flame className="w-6 h-6 text-orange-500" />
                </motion.div>
                <span className="font-bold text-orange-500">
                  {t("levelCard.streakDays", { days: progress.dailyStreak })}
                </span>
                <motion.div
                  animate={reducedMotion ? {} : { scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                >
                  <Flame className="w-6 h-6 text-orange-500" />
                </motion.div>
              </div>
              <p className="text-xs text-orange-400 mt-1">{t("levelCard.keepItUp")}</p>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-4 p-3 rounded-xl bg-muted/50">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-foreground">{progress.dailyStreak}</span>
              <span className="text-muted-foreground">{t("levelCard.dayStreak")}</span>
            </div>
          )}

          {/* Celebrate Button */}
          <Button
            onClick={handleCelebrate}
            variant="outline"
            className="border-border hover:bg-primary/10"
          >
            <Sparkles className="w-4 h-4 mr-2 text-primary" />
            {t("levelCard.celebrateBtn")}
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}
