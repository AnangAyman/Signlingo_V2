"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Lock, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LEAGUES,
  TIER_ORDER,
  type LeagueTier,
} from "@/components/leagues/useLeagueData";
import { formatNumber } from "@/lib/utils/formatNumber";

interface LeagueOverviewProps {
  currentLeague: string;
  currentXp: number;
  reducedMotion?: boolean;
}

function normalizeLeague(value: string): LeagueTier {
  const normalized = value.toLowerCase() as LeagueTier;
  return TIER_ORDER.includes(normalized) ? normalized : "bronze";
}

export function LeagueOverview({
  currentLeague,
  currentXp,
  reducedMotion = false,
}: LeagueOverviewProps) {
  const { t } = useTranslation("leaderboard");
  const { t: tLeague } = useTranslation("leagues");
  const activeTier = normalizeLeague(currentLeague);
  const activeIndex = TIER_ORDER.indexOf(activeTier);
  const activeLeague = LEAGUES[activeTier];
  const ActiveIcon = activeLeague.icon;
  const activeLeagueName = tLeague(activeLeague.displayNameKey, {
    defaultValue: activeLeague.tier[0].toUpperCase() + activeLeague.tier.slice(1),
  });

  return (
    <section className="space-y-4">
      <div
        className="rounded-xl border p-4 sm:p-5"
        style={{
          borderColor: activeLeague.borderColor,
          background: `linear-gradient(135deg, ${activeLeague.gradientFrom}18 0%, ${activeLeague.gradientTo}10 100%)`,
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${activeLeague.gradientFrom} 0%, ${activeLeague.gradientTo} 100%)`,
              }}
            >
              <ActiveIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("leagueOverview.currentLeague", {
                  defaultValue: "Current league",
                })}
              </p>
              <h3 className="text-xl font-bold text-foreground">
                {activeLeagueName}
              </h3>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit text-sm">
            {t("leagueOverview.xp", {
              xp: formatNumber(currentXp),
              defaultValue: `${formatNumber(currentXp)} XP`,
            })}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {TIER_ORDER.map((tier, index) => {
          const league = LEAGUES[tier];
          const unlocked = index <= activeIndex;
          const isCurrent = tier === activeTier;
          const Icon = league.icon;

          return (
            <motion.div
              key={tier}
              initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <Card
                className={`h-full rounded-lg ${
                  isCurrent ? "border-primary/60 bg-primary/5" : ""
                }`}
              >
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                      style={{
                        background: `linear-gradient(135deg, ${league.gradientFrom} 0%, ${league.gradientTo} 100%)`,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {isCurrent ? (
                      <Trophy className="h-4 w-4 text-primary" />
                    ) : unlocked ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {tLeague(league.displayNameKey, {
                        defaultValue: league.tier[0].toUpperCase() + league.tier.slice(1),
                      })}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(league.minXp)} - {formatNumber(league.maxXp)} XP
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
