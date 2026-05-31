"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { X, Trophy, Star, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LeagueInfo } from "./useLeagueData";

interface PromotionAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  fromLeague?: LeagueInfo;
  toLeague: LeagueInfo;
  reducedMotion?: boolean;
}

export function PromotionAnimation({
  isOpen,
  onClose,
  fromLeague,
  toLeague,
  reducedMotion = false,
}: PromotionAnimationProps) {
  const { t } = useTranslation("leagues");
  const Icon = toLeague.icon;

  const triggerConfetti = useCallback(() => {
    if (reducedMotion) return;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: [toLeague.gradientFrom, toLeague.gradientTo, "#ffffff"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: [toLeague.gradientFrom, toLeague.gradientTo, "#ffffff"],
      });
    }, 250);

    return () => clearInterval(interval);
  }, [toLeague, reducedMotion]);

  useEffect(() => {
    if (isOpen) {
      const cleanup = triggerConfetti();

      // Play sound (with autoplay policy handling)
      const audio = new Audio("/sounds/success.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Autoplay blocked - silent fail
      });

      return cleanup;
    }
  }, [isOpen, triggerConfetti]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: 50 }}
            animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md bg-card rounded-3xl p-8 shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Glow */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(circle at center, ${toLeague.gradientFrom} 0%, transparent 70%)`,
              }}
            />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
              aria-label={t("promotion.close")}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="relative z-0 text-center">
              {/* Sparkles */}
              {!reducedMotion && (
                <motion.div
                  className="absolute -top-4 left-1/2 -translate-x-1/2"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                </motion.div>
              )}

              {/* Trophy Animation */}
              <motion.div
                className="mb-6 mx-auto w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${toLeague.gradientFrom} 0%, ${toLeague.gradientTo} 100%)`,
                  boxShadow: `0 0 60px ${toLeague.glowColor}`,
                }}
                animate={reducedMotion ? {} : {
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    `0 0 30px ${toLeague.glowColor}`,
                    `0 0 60px ${toLeague.glowColor}`,
                    `0 0 30px ${toLeague.glowColor}`,
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Icon className="w-12 h-12 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                className="text-3xl font-bold mb-2"
                style={{
                  background: `linear-gradient(135deg, ${toLeague.gradientFrom} 0%, ${toLeague.gradientTo} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                initial={reducedMotion ? {} : { y: 20, opacity: 0 }}
                animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {t("promotion.promoted")}
              </motion.h2>

              <motion.p
                className="text-xl text-foreground mb-2"
                initial={reducedMotion ? {} : { y: 20, opacity: 0 }}
                animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {t("promotion.youveReached")}
              </motion.p>

              <motion.p
                className="text-2xl font-bold mb-6"
                style={{
                  background: `linear-gradient(135deg, ${toLeague.gradientFrom} 0%, ${toLeague.gradientTo} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                initial={reducedMotion ? {} : { y: 20, opacity: 0 }}
                animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {toLeague.displayName}!
              </motion.p>

              {/* Stats */}
              {fromLeague && (
                <motion.div
                  className="flex items-center justify-center gap-4 mb-6"
                  initial={reducedMotion ? {} : { y: 20, opacity: 0 }}
                  animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${fromLeague.gradientFrom} 0%, ${fromLeague.gradientTo} 100%)`,
                      }}
                    >
                      <fromLeague.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-muted-foreground">{fromLeague.displayName}</span>
                  </div>
                  <motion.div
                    animate={reducedMotion ? {} : { x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Trophy className="w-5 h-5 text-primary" />
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${toLeague.gradientFrom} 0%, ${toLeague.gradientTo} 100%)`,
                      }}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-foreground">{toLeague.displayName}</span>
                  </div>
                </motion.div>
              )}

              {/* Rewards */}
              <motion.div
                className="bg-muted/50 rounded-xl p-4 mb-6"
                initial={reducedMotion ? {} : { y: 20, opacity: 0 }}
                animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">{t("promotion.rewardsUnlocked")}</span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{t("promotion.bonusXp")}</p>
                    <p className="text-xs text-muted-foreground">{t("promotion.bonusXpLabel")}</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-secondary">{t("promotion.newBadge")}</p>
                    <p className="text-xs text-muted-foreground">{t("promotion.newBadgeLabel")}</p>
                  </div>
                </div>
              </motion.div>

              {/* Continue Button */}
              <motion.div
                initial={reducedMotion ? {} : { y: 20, opacity: 0 }}
                animate={reducedMotion ? {} : { y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  onClick={onClose}
                  className="w-full h-12 text-base font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${toLeague.gradientFrom} 0%, ${toLeague.gradientTo} 100%)`,
                    color: "#ffffff",
                  }}
                >
                  {t("promotion.continue")}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
