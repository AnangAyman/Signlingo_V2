"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Award, Check } from "lucide-react";
import type { Badge } from "./useGamificationStore";
import { useTranslation } from "react-i18next";

interface BadgesGridProps {
  badges: Badge[];
  reducedMotion?: boolean;
}

export function BadgesGrid({ badges, reducedMotion = false }: BadgesGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const { t } = useTranslation("gamification");

  // Sort badges: earned first (newest first), then locked by progress
  const sortedBadges = [...badges].sort((a, b) => {
    if (!a.isLocked && b.isLocked) return -1;
    if (a.isLocked && !b.isLocked) return 1;
    if (!a.isLocked && !b.isLocked) {
      return (b.earnedAt ? new Date(b.earnedAt).getTime() : 0) - (a.earnedAt ? new Date(a.earnedAt).getTime() : 0);
    }
    // For locked badges, sort by progress percentage
    const aProgress = a.currentProgress / a.requiredValue;
    const bProgress = b.currentProgress / b.requiredValue;
    return bProgress - aProgress;
  });

  const getRarityColor = (rarity: Badge["rarity"]) => {
    switch (rarity) {
      case "common":
        return "border-gray-400 bg-gray-400/10";
      case "rare":
        return "border-blue-500 bg-blue-500/10";
      case "epic":
        return "border-purple-500 bg-purple-500/10";
    }
  };

  const getRarityLabel = (rarity: Badge["rarity"]) => {
    switch (rarity) {
      case "common":
        return { text: t("badges.rarity.common"), className: "bg-gray-500/20 text-gray-400" };
      case "rare":
        return { text: t("badges.rarity.rare"), className: "bg-blue-500/20 text-blue-400" };
      case "epic":
        return { text: t("badges.rarity.epic"), className: "bg-purple-500/20 text-purple-400" };
    }
  };

  const getBadgeText = (badge: Badge) => ({
    name: t(`badges.items.${badge.id}.name`),
    description: t(`badges.items.${badge.id}.description`),
    requirement: t(`badges.items.${badge.id}.requirement`),
  });
  const selectedBadgeText = selectedBadge ? getBadgeText(selectedBadge) : null;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              {t("badges.title")}
            </CardTitle>
            <BadgeUI variant="secondary">
              {badges.filter((b) => !b.isLocked).length}/{badges.length}
            </BadgeUI>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {sortedBadges.map((badge, index) => {
              const badgeText = getBadgeText(badge);

              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                      animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedBadge(badge)}
                      className={`
                        relative p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${badge.isLocked 
                          ? "border-muted bg-muted/30 opacity-60" 
                          : getRarityColor(badge.rarity)
                        }
                        hover:scale-105 hover:shadow-lg
                      `}
                    >
                      {badge.isLocked && (
                        <div className="absolute top-1 right-1">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}

                      <div className="text-center mb-2">
                        <span className={`text-3xl ${badge.isLocked ? "grayscale" : ""}`}>
                          {badge.icon}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-center text-foreground truncate">
                        {badgeText.name}
                      </p>

                      {badge.isLocked && (
                        <div className="mt-2">
                          <Progress
                            value={(badge.currentProgress / badge.requiredValue) * 100}
                            className="h-1"
                          />
                          <p className="text-xs text-center text-muted-foreground mt-1">
                            {badge.currentProgress}/{badge.requiredValue}
                          </p>
                        </div>
                      )}

                      {!badge.isLocked && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-semibold">{badgeText.name}</p>
                    <p className="text-sm text-muted-foreground">{badgeText.description}</p>
                    {badge.isLocked && (
                      <p className="text-xs text-primary mt-1">
                        {t("badges.unlockRequirement", { requirement: badgeText.requirement })}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Badge Detail Modal */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="max-w-sm">
          {selectedBadge && selectedBadgeText && (
            <>
              <DialogHeader className="text-center">
                <motion.div
                  initial={reducedMotion ? {} : { scale: 0.5, opacity: 0 }}
                  animate={reducedMotion ? {} : { scale: 1, opacity: 1 }}
                  className="text-6xl mb-4"
                >
                  {selectedBadge.icon}
                </motion.div>
                <DialogTitle className="text-xl">{selectedBadgeText.name}</DialogTitle>
              </DialogHeader>

              <div className="text-center space-y-4">
                <p className="text-muted-foreground">{selectedBadgeText.description}</p>

                <div className="flex justify-center">
                  <BadgeUI className={getRarityLabel(selectedBadge.rarity).className}>
                    {getRarityLabel(selectedBadge.rarity).text}
                  </BadgeUI>
                </div>

                {selectedBadge.isLocked ? (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedBadgeText.requirement}
                    </p>
                    <Progress
                      value={(selectedBadge.currentProgress / selectedBadge.requiredValue) * 100}
                      className="h-2"
                    />
                    <p className="text-sm text-foreground mt-2">
                      {selectedBadge.currentProgress} / {selectedBadge.requiredValue}
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                    <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-500">{t("badges.earnedOn")}</p>
                    <p className="text-foreground font-medium">
                      {selectedBadge.earnedAt?.toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
