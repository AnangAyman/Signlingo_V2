"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/store";
import { LeagueTiers } from "@/components/leagues";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  BookOpen,
  Trophy,
  Languages,
  ChevronRight,
  Play,
} from "lucide-react";
import Link from "next/link";
import { backendPath } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasCheckedSession } = useAuthStore();
  const { t } = useTranslation("dashboard");

  useEffect(() => {
    if (hasCheckedSession && !isAuthenticated) {
      router.push("/login");
    }
  }, [hasCheckedSession, isAuthenticated, router]);

  if (!hasCheckedSession || !isAuthenticated || !user) {
    return null;
  }

  const xpProgress = (user.xp % 500) / 5; // Progress within current level (0-100)
  const quickActions = [
    { icon: Play, label: t("actions.continueLearning"), href: "/lessons", color: "text-primary", external: false },
    { icon: BookOpen, label: t("actions.practiceCamera"), href: "/ai-game", color: "text-secondary", external: false },
    { icon: Languages, label: "Translation Mode", href: backendPath("/translation_mode"), color: "text-violet-500", external: true },
    { icon: Trophy, label: t("actions.viewAchievements"), href: "/gamification", color: "text-amber-500", external: false },
  ];

  return (
    <div className="min-h-screen bg-background w-full">
      <AppHeader />

      {/* Main Content */}
      <main className="w-full px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {/* Left Column - Progress & Quick Actions */}
          <div className="w-full space-y-4 sm:space-y-5 md:space-y-6">
            {/* User Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-16 h-16 border-4 border-background">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {t("level", { level: user.level })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {t("xpProgress", { current: user.xp % 500 })}
                        </span>
                      </div>
                      <Progress value={xpProgress} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{user.xp}</p>
                          <p className="text-xs text-muted-foreground">{t("totalXp")}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{user.level}</p>
                          <p className="text-xs text-muted-foreground">{t("levelLabel")}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground capitalize">
                            {user.league.charAt(0).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">{t("leagueLabel")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Daily Goals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    {t("dailyGoals")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { labelKey: "goals.completeLessons", progress: 67, completed: 2, total: 3 },
                    { labelKey: "goals.practice", progress: 80, completed: 12, total: 15 },
                    { labelKey: "goals.earnXp", progress: 100, completed: 50, total: 50 },
                  ].map((goal, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground">{t(goal.labelKey)}</span>
                        <Badge variant={goal.progress === 100 ? "default" : "secondary"}>
                          {goal.completed}/{goal.total}
                        </Badge>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t("quickActions")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickActions.map((action, i) => {
                    const content = (
                      <Button
                        variant="ghost"
                        className="w-full justify-between h-12 hover:bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <action.icon className={`w-5 h-5 ${action.color}`} />
                          <span>{action.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    );

                    return action.external ? (
                      <a key={i} href={action.href}>
                        {content}
                      </a>
                    ) : (
                      <Link key={i} href={action.href}>
                        {content}
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - League System */}
          <div className="w-full lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <LeagueTiers
                userId={user.id}
                showHistoricalData
                onPromotion={(event) => {
                  console.log("Promoted!", event);
                }}
                onDemotion={(event) => {
                  console.log("Demoted!", event);
                }}
                onPracticeClick={() => {
                  router.push("/lessons");
                }}
              />
            </motion.div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
