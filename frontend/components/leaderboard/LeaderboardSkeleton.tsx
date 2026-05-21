"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface LeaderboardSkeletonProps {
  count?: number;
  reducedMotion?: boolean;
}

export function LeaderboardSkeleton({
  count = 5,
  reducedMotion = false,
}: LeaderboardSkeletonProps) {
  const { t } = useTranslation("leaderboard");
  return (
    <div className="space-y-2" aria-label={t("loading")} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={
            reducedMotion
              ? { opacity: 1 }
              : { opacity: [0.35, 0.7, 0.35] }
          }
          transition={{
            duration: 1.6,
            delay: i * 0.08,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/40"
        >
          {/* Rank circle */}
          <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
          {/* Name + country */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-3.5 w-28 bg-muted rounded-md" />
            <div className="h-3 w-14 bg-muted rounded-md" />
          </div>
          {/* Change indicator */}
          <div className="hidden md:block h-4 w-8 bg-muted rounded-md" />
          {/* XP */}
          <div className="h-4 w-14 bg-muted rounded-md" />
          {/* Button */}
          <div className="h-8 w-20 bg-muted rounded-lg" />
        </motion.div>
      ))}
    </div>
  );
}
