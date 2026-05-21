"use client";

import { motion } from "framer-motion";
import { Lock, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Badge } from "./useGamificationStore";

interface BadgeCardProps {
  badge: Badge;
  index?: number;
  reducedMotion?: boolean;
  onClick?: (badge: Badge) => void;
}

const rarityBorder: Record<Badge["rarity"], string> = {
  common: "border-gray-400 bg-gray-400/10",
  rare: "border-blue-500 bg-blue-500/10",
  epic: "border-purple-500 bg-purple-500/10",
};

function safeDate(d: Date | string | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

export function BadgeCard({
  badge,
  index = 0,
  reducedMotion = false,
  onClick,
}: BadgeCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
          animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onClick?.(badge)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClick?.(badge);
          }}
          className={[
            "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
            badge.isLocked
              ? "border-muted bg-muted/30 opacity-60"
              : rarityBorder[badge.rarity],
            "hover:scale-105 hover:shadow-lg",
          ].join(" ")}
          role="button"
          tabIndex={0}
          aria-label={`${badge.name} badge – ${badge.isLocked ? "locked" : "unlocked"}`}
          whileTap={reducedMotion ? {} : { scale: 0.95 }}
        >
          {/* Lock icon */}
          {badge.isLocked && (
            <div className="absolute top-1 right-1" aria-hidden>
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
          )}

          {/* Earned checkmark */}
          {!badge.isLocked && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
              aria-hidden
            >
              <Check className="w-3 h-3 text-white" />
            </div>
          )}

          {/* Icon */}
          <div className="text-center mb-2">
            <span
              className={`text-3xl ${badge.isLocked ? "grayscale" : ""}`}
              aria-hidden
            >
              {badge.icon}
            </span>
          </div>

          {/* Name */}
          <p className="text-xs font-medium text-center text-foreground truncate">
            {badge.name}
          </p>

          {/* Progress bar for locked badges */}
          {badge.isLocked && (
            <div className="mt-2">
              <Progress
                value={(badge.currentProgress / badge.requiredValue) * 100}
                className="h-1"
                role="progressbar"
                aria-valuenow={badge.currentProgress}
                aria-valuemin={0}
                aria-valuemax={badge.requiredValue}
                aria-label={`${badge.name} progress`}
              />
              <p className="text-xs text-center text-muted-foreground mt-1">
                {badge.currentProgress}/{badge.requiredValue}
              </p>
            </div>
          )}
        </motion.div>
      </TooltipTrigger>

      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold">{badge.name}</p>
        <p className="text-sm text-muted-foreground">{badge.description}</p>
        {badge.isLocked ? (
          <p className="text-xs text-primary mt-1">
            {badge.requirement} to unlock
          </p>
        ) : (
          badge.earnedAt && (
            <p className="text-xs text-green-500 mt-1">
              Earned {safeDate(badge.earnedAt)}
            </p>
          )
        )}
      </TooltipContent>
    </Tooltip>
  );
}
