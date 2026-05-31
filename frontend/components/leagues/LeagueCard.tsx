"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatNumber, formatOrdinal } from "@/lib/utils/formatNumber";
import type { LeagueInfo, UserLeagueStatus } from "./useLeagueData";

interface LeagueCardProps {
  league: LeagueInfo;
  isActive: boolean;
  isUnlocked: boolean;
  userStatus?: UserLeagueStatus;
  showDemotionWarning?: boolean;
  onClick?: () => void;
  reducedMotion?: boolean;
}

export function LeagueCard({
  league,
  isActive,
  isUnlocked,
  userStatus,
  showDemotionWarning,
  onClick,
  reducedMotion = false,
}: LeagueCardProps) {
  const { t } = useTranslation("leagues");
  const Icon = league.icon;
  const progressPercent = userStatus
    ? Math.min(100, ((userStatus.weeklyXp - league.minXp) / (league.maxXp - league.minXp)) * 100)
    : 0;

  const isPromoting = userStatus?.promotionDemotionState === "promoting";
  const isDemoting = userStatus?.promotionDemotionState === "demoting";

  return (
    <TooltipProvider>
      <motion.div
        onClick={onClick}
        className={`
          relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-7 cursor-pointer
          backdrop-blur-md transition-all duration-300 min-h-[200px] sm:min-h-[220px] md:min-h-[240px]
          flex flex-col justify-between
          ${isActive
            ? "bg-card/90 shadow-2xl border-2 ring-2 ring-offset-2 ring-offset-background"
            : isUnlocked
            ? "bg-card/60 border border-border/50 hover:bg-card/80"
            : "bg-muted/30 border border-border/30"
          }
        `}
        style={{
          borderColor: isActive ? league.borderColor : undefined,
          boxShadow: isActive ? `0 0 40px ${league.glowColor}` : undefined,
          ringColor: isActive ? league.borderColor : undefined,
        } as React.CSSProperties}
        initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={reducedMotion ? {} : {
          opacity: 1,
          y: 0,
          scale: isActive ? 1.02 : 1,
        }}
        whileHover={reducedMotion ? {} : {
          scale: isActive ? 1.02 : 1.01,
          y: isActive ? 0 : -4,
        }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, ${league.gradientFrom} 0%, ${league.gradientTo} 100%)`,
          }}
        />

        {!isUnlocked && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("card.reachToUnlock", { xp: formatNumber(league.minXp) })}
              </p>
            </div>
          </div>
        )}

        <div className="relative z-0 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-3 sm:p-4 rounded-lg sm:rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${league.gradientFrom} 0%, ${league.gradientTo} 100%)`,
                }}
                animate={isActive && !reducedMotion ? {
                  boxShadow: [
                    `0 0 20px ${league.glowColor}`,
                    `0 0 40px ${league.glowColor}`,
                    `0 0 20px ${league.glowColor}`,
                  ],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg text-foreground">{league.displayName}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {formatNumber(league.minXp)} - {formatNumber(league.maxXp)}
                </p>
              </div>
            </div>
          </div>

          {isActive && userStatus ? (
            <>
              <div className="mb-3 sm:mb-4 mt-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t("card.weeklyXp")}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatNumber(userStatus.weeklyXp)} / {formatNumber(league.maxXp)}
                  </span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${league.gradientFrom} 0%, ${league.gradientTo} 100%)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    role="progressbar"
                    aria-valuenow={userStatus.weeklyXp}
                    aria-valuemin={league.minXp}
                    aria-valuemax={league.maxXp}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ChevronUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">{t("card.promotionZone")}</span>
                  </div>
                  <p className="font-bold text-foreground">{t("card.top", { n: league.promotionRank })}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ChevronDown className="w-4 h-4 text-destructive" />
                    <span className="text-xs text-muted-foreground">{t("card.demotionZone")}</span>
                  </div>
                  <p className="font-bold text-foreground">{t("card.bottom", { n: league.leagueSize - league.demotionRank + 1 })}</p>
                </div>
              </div>

              {isPromoting && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-center"
                >
                  <span className="text-green-500 font-semibold">{t("card.promotionIncoming")}</span>
                </motion.div>
              )}

              {isDemoting && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/20 border border-destructive/50 rounded-lg p-3 text-center"
                >
                  <span className="text-destructive font-semibold">{t("card.demotionRisk")}</span>
                </motion.div>
              )}

              {showDemotionWarning && !isDemoting && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      animate={reducedMotion ? {} : { x: [-5, 5, -5, 5, 0] }}
                      transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 10 }}
                      className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 text-center cursor-help"
                    >
                      <span className="text-amber-500 font-semibold text-sm">
                        {t("card.demotionWarningMsg", { league: league.displayName })}
                      </span>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("card.demotionTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          ) : isUnlocked ? (
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">{t("card.topPlayersPromoted", { n: league.promotionRank })}</p>
              <p>{t("card.bottomPlayersDemoted", { n: league.leagueSize - league.demotionRank + 1 })}</p>
            </div>
          ) : null}
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
