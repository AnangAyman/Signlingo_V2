"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Zap,
  Calendar,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LeagueCard } from "./LeagueCard";
import { PromotionAnimation } from "./PromotionAnimation";
import { DemotionWarning } from "./DemotionWarning";
import { useLeagueData, LEAGUES, TIER_ORDER, type LeagueEvent, type LeagueTier } from "./useLeagueData";
import { formatNumber, formatOrdinal } from "@/lib/utils/formatNumber";

interface LeagueTiersProps {
  userId: string;
  onPromotion?: (event: LeagueEvent) => void;
  onDemotion?: (event: LeagueEvent) => void;
  onPracticeClick?: () => void;
  showHistoricalData?: boolean;
}

export default function LeagueTiers({
  userId,
  onPromotion,
  onDemotion,
  onPracticeClick,
  showHistoricalData = false,
}: LeagueTiersProps) {
  const { t } = useTranslation("leagues");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard">("overview");

  const {
    status,
    participants,
    loading,
    error,
    showPromotionModal,
    showDemotionTooltip,
    leagueHistory,
    addXp,
    simulateWeekEnd,
    closePromotionModal,
    dismissDemotionTooltip,
    refetch,
  } = useLeagueData({
    userId,
    onPromotion,
    onDemotion,
  });

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleAddXp = useCallback(
    (amount: number) => {
      addXp(amount);
    },
    [addXp]
  );

  if (loading) {
    return <LeagueTiersSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{t("failedToLoad")}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("tryAgain")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const currentLeague = LEAGUES[status.currentTier];
  const currentLeagueName = t(currentLeague.displayNameKey);
  const currentTierIndex = TIER_ORDER.indexOf(status.currentTier);
  const previousLeague = currentTierIndex > 0 ? LEAGUES[TIER_ORDER[currentTierIndex - 1]] : null;

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">{t("title")}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refetch}
            variant="outline"
            size="sm"
            className="border-border"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("refresh")}
          </Button>
          {/* Dev tools - simulate week end */}
          <Button
            onClick={simulateWeekEnd}
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {t("endWeek")}
          </Button>
        </div>
      </div>

      {/* Current Status Banner */}
      <motion.div
        initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6"
        style={{
          background: `linear-gradient(135deg, ${currentLeague.gradientFrom}20 0%, ${currentLeague.gradientTo}20 100%)`,
          borderColor: currentLeague.borderColor,
          borderWidth: "1px",
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at top right, ${currentLeague.gradientFrom} 0%, transparent 60%)`,
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 md:gap-6">
          {/* League Icon */}
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${currentLeague.gradientFrom} 0%, ${currentLeague.gradientTo} 100%)`,
            }}
            animate={reducedMotion ? {} : {
              boxShadow: [
                `0 0 20px ${currentLeague.glowColor}`,
                `0 0 40px ${currentLeague.glowColor}`,
                `0 0 20px ${currentLeague.glowColor}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <currentLeague.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>

          {/* Status Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-foreground">
                {currentLeagueName}
              </h3>
              <Badge
                variant="secondary"
                className="text-sm"
                style={{
                  background: `${currentLeague.gradientFrom}30`,
                  color: currentLeague.gradientFrom,
                }}
              >
                {formatOrdinal(status.currentRank)} {t("place")}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("weeklyXp")}</p>
                <p className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  {formatNumber(status.weeklyXp)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("xpToPromote")}</p>
                <p className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                  {formatNumber(Math.max(0, status.xpToNext))}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("streak")}</p>
                <p className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1">
                  <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                  {t("streakDays", { count: status.streakDays })}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("leagueSize")}</p>
                <p className="text-base sm:text-lg font-bold text-foreground">
                  {t("players", { count: currentLeague.leagueSize })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick XP Add (for testing) */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground text-center">{t("addXpTest")}</p>
            <div className="flex gap-2">
              {[10, 50, 100].map((xp) => (
                <Button
                  key={xp}
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddXp(xp)}
                  className="w-14"
                >
                  +{xp}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="leaderboard">{t("leaderboard")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* League Cards Grid */}
          <div className="grid w-full gap-3 sm:gap-4 md:gap-5 lg:gap-6 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {TIER_ORDER.map((tier, index) => {
              const league = LEAGUES[tier];
              const isActive = tier === status.currentTier;
              const isUnlocked = index <= currentTierIndex;
              const showWarning =
                isActive &&
                status.currentRank >= league.demotionRank &&
                status.promotionDemotionState !== "demoting";

              return (
                <LeagueCard
                  key={tier}
                  league={league}
                  isActive={isActive}
                  isUnlocked={isUnlocked}
                  userStatus={isActive ? status : undefined}
                  showDemotionWarning={showWarning}
                  reducedMotion={reducedMotion}
                />
              );
            })}
          </div>

          {/* Historical Data */}
          {showHistoricalData && leagueHistory.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">{t("history")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leagueHistory.slice(-5).reverse().map((event, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      {event.type === "promotion" ? (
                        <div className="p-2 rounded-full bg-green-500/20">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      ) : event.type === "demotion" ? (
                        <div className="p-2 rounded-full bg-destructive/20">
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-muted">
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {event.type === "promotion"
                            ? t("promotedTo", { league: t(LEAGUES[event.toTier!].displayNameKey) })
                            : event.type === "demotion"
                            ? t("demotedTo", { league: t(LEAGUES[event.toTier!].displayNameKey) })
                            : t("rankChanged", { rank: formatOrdinal(event.newRank) })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  {t("standings", { league: currentLeagueName })}
                </CardTitle>
                <Badge variant="outline">{t("week", { week: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) })}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 p-4">
                  {participants.map((participant, index) => {
                    const isPromotionZone = participant.rank <= currentLeague.promotionRank;
                    const isDemotionZone = participant.rank >= currentLeague.demotionRank;
                    const isCurrentUser = participant.isCurrentUser;

                    return (
                      <motion.div
                        key={participant.userId}
                        initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
                        animate={reducedMotion ? {} : { opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`
                          flex items-center gap-4 p-3 rounded-xl transition-colors
                          ${isCurrentUser
                            ? "bg-primary/10 border-l-4 border-primary"
                            : isPromotionZone
                            ? "bg-green-500/10"
                            : isDemotionZone
                            ? "bg-destructive/10"
                            : "hover:bg-muted/50"
                          }
                        `}
                      >
                        {/* Rank */}
                        <div
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                            ${participant.rank === 1
                              ? "bg-yellow-500 text-white"
                              : participant.rank === 2
                              ? "bg-gray-400 text-white"
                              : participant.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-muted text-muted-foreground"
                            }
                          `}
                        >
                          {participant.rank}
                        </div>

                        {/* Avatar */}
                        <Avatar className="w-10 h-10">
                          <AvatarFallback
                            className={`${
                              isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary"
                            }`}
                          >
                            {participant.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium truncate ${
                              isCurrentUser ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {participant.username}
                            {isCurrentUser && ` ${t("you")}`}
                          </p>
                        </div>

                        {/* Zone Badge */}
                        {isPromotionZone && (
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/50">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {t("promote")}
                          </Badge>
                        )}
                        {isDemotionZone && (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/50">
                            <TrendingDown className="w-3 h-3 mr-1" />
                            {t("demote")}
                          </Badge>
                        )}

                        {/* XP */}
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            {formatNumber(participant.xp)}
                          </p>
                          <p className="text-xs text-muted-foreground">{t("xp")}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Promotion Modal */}
      <PromotionAnimation
        isOpen={showPromotionModal}
        onClose={closePromotionModal}
        fromLeague={previousLeague || undefined}
        toLeague={currentLeague}
        reducedMotion={reducedMotion}
      />

      {/* Demotion Warning */}
      <DemotionWarning
        isVisible={showDemotionTooltip}
        onDismiss={dismissDemotionTooltip}
        onPractice={onPracticeClick}
        league={currentLeague}
        currentRank={status.currentRank}
        xpNeeded={status.xpToAvoidDemotion}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

// Skeleton loader
function LeagueTiersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <Skeleton className="h-32 w-full rounded-2xl" />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
