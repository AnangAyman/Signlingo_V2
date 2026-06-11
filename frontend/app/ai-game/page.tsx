"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  CameraPracticeActivity,
  MagicTouchPracticeActivity,
} from "@/components/lessons/InteractiveActivity";
import { lessonsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

type PracticeMode = "magic" | "camera";

const MODES: Array<{
  value: PracticeMode;
  lessonKey: string;
  Icon: typeof Zap;
}> = [
  { value: "magic", lessonKey: "magic_touch", Icon: Zap },
  { value: "camera", lessonKey: "show_your_signs", Icon: Camera },
];

export default function AIGamePage() {
  const router = useRouter();
  const { t } = useTranslation("ai-game");
  const { isAuthenticated, hasCheckedSession } = useAuthStore();
  const [mode, setMode] = useState<PracticeMode>("magic");
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasCheckedSession && !isAuthenticated) router.push("/login");
  }, [hasCheckedSession, isAuthenticated, router]);

  const markComplete = useCallback(async (lessonKey: string) => {
    await lessonsApi.markStatus(lessonKey, "completed");
    setCompletedMessage("Progress saved to Lessons.");
  }, []);

  if (!hasCheckedSession || !isAuthenticated) return null;

  const activeMode = MODES.find((item) => item.value === mode) ?? MODES[0];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="w-full px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {t("badge")}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                {t("title")}
              </h1>
            </div>
            {completedMessage && (
              <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">
                {completedMessage}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {MODES.map(({ value, Icon }) => {
              const active = mode === value;
              return (
                <Button
                  key={value}
                  variant={active ? "default" : "outline"}
                  onClick={() => {
                    setMode(value);
                    setCompletedMessage(null);
                  }}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {value === "magic" ? t("magicTouch.title") : t("cameraPractice.title")}
                </Button>
              );
            })}
          </div>

          {activeMode.value === "magic" ? (
            <MagicTouchPracticeActivity
              lessonKey={activeMode.lessonKey}
              onCompleted={() => markComplete(activeMode.lessonKey)}
            />
          ) : (
            <CameraPracticeActivity
              lessonKey={activeMode.lessonKey}
              onCompleted={() => markComplete(activeMode.lessonKey)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
