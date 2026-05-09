"use client";

import { motion } from "framer-motion";
import { Globe, Users } from "lucide-react";
import type { LeaderboardView } from "./useLeaderboardData";
import { useTranslation } from "react-i18next";

interface SegmentedControlProps {
  value: LeaderboardView;
  onChange: (view: LeaderboardView) => void;
  reducedMotion?: boolean;
}

export function SegmentedControl({
  value,
  onChange,
  reducedMotion = false,
}: SegmentedControlProps) {
  const { t } = useTranslation("leaderboard");

  const OPTIONS: { value: LeaderboardView; labelKey: string; Icon: typeof Globe }[] = [
    { value: "global", labelKey: "global", Icon: Globe },
    { value: "friends", labelKey: "friends", Icon: Users },
  ];

  return (
    <div
      role="tablist"
      aria-label={t("title")}
      className="relative flex rounded-xl bg-muted p-1 gap-0.5"
    >
      {OPTIONS.map(({ value: v, labelKey, Icon }) => {
        const isActive = value === v;
        const label = t(labelKey);
        return (
          <button
            key={v}
            role="tab"
            data-active={isActive}
            aria-label={t("viewLabel", { view: label })}
            onClick={() => onChange(v)}
            className={`
              relative flex-1 flex items-center justify-center gap-2
              px-5 py-2.5 text-sm font-semibold rounded-lg z-10
              transition-colors duration-200
              ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
            `}
          >
            {isActive && !reducedMotion && (
              <motion.div
                layoutId="segment-indicator"
                className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/40"
                transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
              />
            )}
            {isActive && reducedMotion && (
              <div className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/40" />
            )}
            <Icon className="relative z-10 w-4 h-4" />
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
