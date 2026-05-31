"use client";

import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { DailyQuest } from "./useGamificationStore";

interface QuestItemProps {
  quest: DailyQuest;
  reducedMotion?: boolean;
  /** Called when a quest whose progress meets its total is manually checked off */
  onComplete: (questId: string) => void;
  /** Simulates one unit of progress on a quest */
  onProgress: (questId: string) => void;
}

export function QuestItem({
  quest,
  reducedMotion = false,
  onComplete,
  onProgress,
}: QuestItemProps) {
  const progressPercent = Math.min(
    Math.round((quest.progress / quest.total) * 100),
    100
  );
  const isReady = quest.progress >= quest.total && !quest.completed;

  return (
    <motion.div
      layout
      initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
      animate={reducedMotion ? {} : { opacity: 1, x: 0 }}
      className={[
        "p-4 rounded-xl border transition-all",
        quest.completed
          ? "bg-green-500/10 border-green-500/30"
          : "bg-muted/30 border-border hover:bg-muted/50",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <motion.button
          onClick={() => isReady && onComplete(quest.id)}
          whileTap={reducedMotion || (!isReady && !quest.completed) ? {} : { scale: 0.85 }}
          disabled={!isReady && !quest.completed}
          aria-label={
            quest.completed
              ? `${quest.description} – completed`
              : isReady
              ? `Mark complete: ${quest.description}`
              : `Quest not ready: ${quest.description}`
          }
          aria-pressed={quest.completed}
          className={[
            "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
            quest.completed
              ? "bg-green-500 border-green-500"
              : isReady
              ? "border-primary bg-primary/20 cursor-pointer"
              : "border-muted-foreground opacity-50 cursor-not-allowed",
          ].join(" ")}
        >
          {quest.completed && (
            <Check className="w-3 h-3 text-white" aria-hidden />
          )}
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-sm font-medium ${
                quest.completed
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {quest.description}
            </p>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary whitespace-nowrap">
              <Zap className="w-3 h-3" aria-hidden />+{quest.xpReward} XP
            </span>
          </div>

          {/* Progress */}
          {!quest.completed && (
            <div className="mt-2">
              <Progress
                value={progressPercent}
                className="h-1.5"
                role="progressbar"
                aria-valuenow={quest.progress}
                aria-valuemin={0}
                aria-valuemax={quest.total}
                aria-label={`${quest.description} progress`}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {quest.progress}/{quest.total}
                </p>
                {!quest.completed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-xs px-2 py-0 text-muted-foreground hover:text-foreground"
                    onClick={() => onProgress(quest.id)}
                    aria-label={`Simulate one step of progress for: ${quest.description}`}
                  >
                    +1
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
