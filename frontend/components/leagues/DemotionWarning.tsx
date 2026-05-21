"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LeagueInfo } from "./useLeagueData";

interface DemotionWarningProps {
  isVisible: boolean;
  onDismiss: () => void;
  onPractice?: () => void;
  league: LeagueInfo;
  currentRank: number;
  xpNeeded: number;
  reducedMotion?: boolean;
}

export function DemotionWarning({
  isVisible,
  onDismiss,
  onPractice,
  league,
  currentRank,
  xpNeeded,
  reducedMotion = false,
}: DemotionWarningProps) {
  const { t } = useTranslation("leagues");
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40"
        >
          <motion.div
            className="bg-card border border-amber-500/50 rounded-2xl p-4 shadow-2xl"
            animate={reducedMotion ? {} : { 
              boxShadow: [
                "0 0 20px rgba(251, 191, 36, 0.2)",
                "0 0 40px rgba(251, 191, 36, 0.3)",
                "0 0 20px rgba(251, 191, 36, 0.2)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-2 rounded-xl bg-amber-500/20"
                  animate={reducedMotion ? {} : { rotate: [-5, 5, -5] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </motion.div>
                <div>
                  <h4 className="font-bold text-foreground">{t("demotionWarning.title")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("demotionWarning.subtitle")}
                  </p>
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                aria-label={t("demotionWarning.dismiss")}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Status */}
            <div className="bg-amber-500/10 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{t("demotionWarning.currentRank")}</span>
                <span className="font-bold text-amber-500">#{currentRank}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("demotionWarning.xpNeeded")}</span>
                <span className="font-bold text-foreground">{xpNeeded} {t("xp")}</span>
              </div>
            </div>

            {/* Message */}
            <p className="text-sm text-muted-foreground mb-4">
              {t("demotionWarning.messagePre")}<strong className="text-foreground">{league.displayName}</strong>{t("demotionWarning.messagePost")}
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={onPractice}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t("demotionWarning.practiceNow")}
              </Button>
              <Button
                onClick={onDismiss}
                variant="outline"
                className="border-border"
              >
                {t("demotionWarning.later")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
