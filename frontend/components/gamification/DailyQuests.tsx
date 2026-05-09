"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QuestItem } from "./QuestItem";
import { useGamificationStore } from "./useGamificationStore";
import { useTranslation } from "react-i18next";

interface DailyQuestsProps {
  reducedMotion?: boolean;
}

export function DailyQuests({ reducedMotion = false }: DailyQuestsProps) {
  const { t } = useTranslation("gamification");
  const { dailyQuests, userProgress, completeQuest, simulateNewDay } =
    useGamificationStore();

  // Auto-reset quests when calendar day changes
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (userProgress.lastActiveDate && userProgress.lastActiveDate !== today) {
      simulateNewDay();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = dailyQuests.filter((q) => q.completed).length;
  const remainingXp = dailyQuests
    .filter((q) => !q.completed)
    .reduce((sum, q) => sum + q.xpReward, 0);

  const handleCompleteQuest = (questId: string) => {
    const quest = useGamificationStore
      .getState()
      .dailyQuests.find((q) => q.id === questId);
    if (!quest || quest.completed || quest.progress < quest.total) return;

    const xpReward = quest.xpReward;
    completeQuest(questId);
    toast.success(t("quests.questCompleteToast", { xp: xpReward }));
  };

  const handleProgressQuest = (questId: string) => {
    const state = useGamificationStore.getState();
    const quest = state.dailyQuests.find((q) => q.id === questId);
    if (!quest || quest.completed) return;

    const newProgress = Math.min(quest.progress + 1, quest.total);
    useGamificationStore.setState((prev) => ({
      dailyQuests: prev.dailyQuests.map((q) =>
        q.id === questId ? { ...q, progress: newProgress } : q
      ),
    }));

    // Auto-complete once progress meets the target
    if (newProgress >= quest.total) {
      // Use a microtask so the setState above is flushed first
      Promise.resolve().then(() => handleCompleteQuest(questId));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" aria-hidden />
            {t("quests.title")}
          </CardTitle>
          <Badge variant="secondary">
            {completedCount}/{dailyQuests.length}
          </Badge>
        </div>

        {remainingXp > 0 && (
          <p className="text-sm text-muted-foreground">
            <Zap className="inline w-3 h-3 mr-1 text-primary" aria-hidden />
            {t("quests.xpAvailable", { xp: remainingXp })}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {dailyQuests.map((quest, i) => (
          <motion.div
            key={quest.id}
            initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <QuestItem
              quest={quest}
              reducedMotion={reducedMotion}
              onComplete={handleCompleteQuest}
              onProgress={handleProgressQuest}
            />
          </motion.div>
        ))}

        {completedCount === dailyQuests.length && dailyQuests.length > 0 && (
          <motion.p
            initial={reducedMotion ? {} : { scale: 0.9, opacity: 0 }}
            animate={reducedMotion ? {} : { scale: 1, opacity: 1 }}
            className="text-center py-3 text-green-500 font-semibold text-sm"
          >
            {t("quests.allComplete")}
          </motion.p>
        )}

        {/* Dev / demo control */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-muted-foreground border-dashed"
          onClick={() => {
            simulateNewDay();
            toast.info(t("quests.simulateNewDayToast"));
          }}
          aria-label="Simulate a new day to reset daily quests"
        >
          <RefreshCw className="w-3 h-3 mr-2" aria-hidden />
          {t("quests.simulateNewDay")}
        </Button>
      </CardContent>
    </Card>
  );
}
