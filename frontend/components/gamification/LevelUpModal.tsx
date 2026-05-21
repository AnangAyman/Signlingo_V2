"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Trophy, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGamificationStore } from "./useGamificationStore";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { useTranslation } from "react-i18next";

interface LevelUpModalProps {
  reducedMotion?: boolean;
}

export function LevelUpModal({ reducedMotion = false }: LevelUpModalProps) {
  const { t } = useTranslation("gamification");
  const { showLevelUpModal, newLevel, closeLevelUpModal } =
    useGamificationStore();
  const { play } = useSoundEffect();

  useEffect(() => {
    if (!showLevelUpModal || newLevel === null) return;

    toast.success(t("levelUp.toast", { level: newLevel }));
    play("/sounds/level-up.mp3");

    if (reducedMotion) return;

    // Side-cannon confetti burst
    const end = Date.now() + 3000;
    const colors = ["#6366f1", "#f59e0b", "#14b8a6", "#ec4899"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [showLevelUpModal, newLevel, reducedMotion, play]);

  return (
    <AnimatePresence>
      {showLevelUpModal && newLevel !== null && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={closeLevelUpModal}
            aria-hidden
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            aria-live="assertive"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Level up – you reached level ${newLevel}`}
              initial={
                reducedMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0, y: 40 }
              }
              animate={
                reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }
              }
              exit={
                reducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: 20 }
              }
              transition={{ type: "spring", damping: 18, stiffness: 220 }}
              className="relative bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl pointer-events-auto"
            >
              {/* Close button */}
              <button
                onClick={closeLevelUpModal}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
                aria-label={t("levelUp.closeLabel")}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Trophy icon */}
              <motion.div
                animate={
                  reducedMotion
                    ? {}
                    : { rotate: [0, -12, 12, -6, 6, 0] }
                }
                transition={{ duration: 0.6, delay: 0.25 }}
                className="text-7xl mb-3"
                aria-hidden
              >
                🏆
              </motion.div>

              {/* Headline */}
              <motion.h2
                initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl font-black bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent mb-3"
              >
                {t("levelUp.title")}
              </motion.h2>

              {/* Level badge */}
              <motion.div
                initial={reducedMotion ? {} : { scale: 0 }}
                animate={reducedMotion ? {} : { scale: 1 }}
                transition={{ type: "spring", damping: 10, delay: 0.3 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/15 border-4 border-primary mb-4"
                aria-label={`Level ${newLevel}`}
              >
                <span className="text-3xl font-black text-primary">
                  {newLevel}
                </span>
              </motion.div>

              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t("levelUp.message", { level: newLevel })}
              </p>

              <Button
                onClick={closeLevelUpModal}
                size="lg"
                className="w-full"
                aria-label={t("levelUp.dismissLabel")}
              >
                <Sparkles className="w-4 h-4 mr-2" aria-hidden />
                {t("levelUp.ctaBtn")}
              </Button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
