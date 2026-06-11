"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Trophy, Star, Crown, Zap, ArrowUp, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

const LEAGUE_CONFIGS = [
  {
    key: "bronze" as const,
    icon: Trophy,
    gradient: "from-[#CD7F32] to-[#8B5A2B]",
    bgGradient: "from-[#CD7F32]/10 to-[#8B5A2B]/10",
    borderColor: "border-[#CD7F32]/30",
    xpRequired: 0,
    position: 0,
  },
  {
    key: "silver" as const,
    icon: Star,
    gradient: "from-[#C0C0C0] to-[#A9A9A9]",
    bgGradient: "from-[#C0C0C0]/10 to-[#A9A9A9]/10",
    borderColor: "border-[#C0C0C0]/30",
    xpRequired: 500,
    position: 1,
  },
  {
    key: "gold" as const,
    icon: Crown,
    gradient: "from-[#FFD700] to-[#DAA520]",
    bgGradient: "from-[#FFD700]/10 to-[#DAA520]/10",
    borderColor: "border-[#FFD700]/30",
    xpRequired: 1500,
    position: 2,
  },
];

export function LeaguesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [hoveredLeague, setHoveredLeague] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <section
      id="leagues"
      className="py-24 relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background"
    >
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#FFD700]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#C0C0C0]/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD700]/10 text-[#DAA520] font-medium text-sm mb-4"
          >
            <Trophy className="w-4 h-4" />
            {t("leagues.badge")}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            {t("leagues.title")}{" "}
            <span className="bg-gradient-to-r from-[#CD7F32] via-[#C0C0C0] to-[#FFD700] bg-clip-text text-transparent">
              {t("leagues.titleSuffix")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("leagues.subtitle")}
          </p>
        </motion.div>

        {/* Leagues Grid */}
        <TooltipProvider delayDuration={200}>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {LEAGUE_CONFIGS.map(({ key, icon: Icon, gradient, bgGradient, borderColor, xpRequired, position }, index) => {
              const leagueName = t(`leagues.tiers.${key}.name`);
              const requirement = t(`leagues.tiers.${key}.requirement`);
              const benefits = t(`leagues.tiers.${key}.benefits`, { returnObjects: true }) as string[];
              return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                onHoverStart={() => setHoveredLeague(key)}
                onHoverEnd={() => setHoveredLeague(null)}
                className={cn(
                  "relative group cursor-pointer",
                  index === 2 && "md:scale-105 md:z-10"
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "h-full p-6 lg:p-8 rounded-2xl border-2 transition-all duration-300",
                        borderColor,
                        `bg-gradient-to-br ${bgGradient}`,
                        hoveredLeague === key &&
                          "shadow-2xl -translate-y-2 border-opacity-100",
                        index === 2 && "ring-2 ring-[#FFD700]/20"
                      )}
                    >
                      {/* Icon Badge */}
                      <div
                        className={cn(
                          "w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg",
                          gradient
                        )}
                      >
                        <Icon className="w-10 h-10 text-white drop-shadow-md" />
                      </div>

                      {/* League Name */}
                      <h3
                        className={cn(
                          "text-2xl font-bold text-center mb-2 bg-gradient-to-r bg-clip-text text-transparent",
                          gradient
                        )}
                      >
                        {leagueName}
                      </h3>

                      {/* Requirement */}
                      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
                        {index > 0 ? (
                          <>
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm">{requirement}</span>
                          </>
                        ) : (
                          <span className="text-sm">{requirement}</span>
                        )}
                      </div>

                      {/* Benefits */}
                      <ul className="space-y-3">
                        {benefits.map((benefit, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-3 text-foreground"
                          >
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                                gradient
                              )}
                            >
                              <ArrowUp className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm">{benefit}</span>
                          </li>
                        ))}
                      </ul>

                      {/* XP Progress Indicator */}
                      {index > 0 && (
                        <div className="mt-6 pt-6 border-t border-border/50">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">
                              {t("leagues.xpRequired")}
                            </span>
                            <span className="font-semibold">
                              {xpRequired.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={isInView ? { width: "35%" } : {}}
                              transition={{ duration: 1, delay: 0.5 + index * 0.2 }}
                              className={cn(
                                "h-full rounded-full bg-gradient-to-r",
                                gradient
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {/* Popular Badge for Gold */}
                      {index === 2 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-4 py-1 bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-white text-xs font-bold rounded-full shadow-lg">
                            {t("leagues.eliteBadge")}
                          </span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-semibold mb-1">
                      {t("leagues.tooltipTitle", { league: leagueName })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`leagues.tiers.${key}.tooltip`)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            );
            })}
          </div>
        </TooltipProvider>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">
            {t("leagues.ctaPrompt")}
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FFD700] to-[#DAA520] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" onClick={() => router.push('/leaderboard')}>
            <Trophy className="w-5 h-5" />
            {t("leagues.ctaButton")}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
