"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  Circle,
  PlayCircle,
  ChevronRight,
  RefreshCcw,
  ExternalLink,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  QuizPracticeActivity,
} from "@/components/lessons/InteractiveActivity";
import { useAuthStore } from "@/lib/store";
import { backendPath, lessonsApi, type ApiLesson } from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEmbedUrl(url: string): string {
  // Convert https://youtu.be/ID or https://www.youtube.com/watch?v=ID to embed URL.
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
  } catch {
    // Not a valid URL — return as-is.
  }
  return url;
}

function isBackendRoute(url: string): boolean {
  return url.startsWith("/");
}

function statusLabel(t: (key: string) => string, status: ApiLesson["status"]): string {
  return t(`status.${status}`);
}

function lessonTitle(
  t: (key: string, options?: Record<string, unknown>) => string,
  lesson: ApiLesson
): string {
  return t(`lessonTitles.${lesson.key}`, { defaultValue: lesson.title });
}

function getBackendLessonVideoUrl(url: string): string | null {
  if (url === "/video_learning") {
    return backendPath("/static/Assets/Learn ASL Alphabet Video.mp4");
  }
  return null;
}

function isLessonPageItem(lesson: ApiLesson): boolean {
  return lesson.url === "/video_learning" || lesson.url === "/gamepage";
}

function StatusIcon({ status }: { status: ApiLesson["status"] }) {
  if (status === "completed")
    return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
  if (status === "in_progress")
    return <PlayCircle className="w-5 h-5 text-primary shrink-0" />;
  return <Circle className="w-5 h-5 text-muted-foreground shrink-0" />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LessonsPage() {
  const router = useRouter();
  const { t } = useTranslation("lessons");
  const { isAuthenticated, hasCheckedSession } = useAuthStore();

  const [lessons, setLessons] = useState<ApiLesson[]>([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<ApiLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (hasCheckedSession && !isAuthenticated) router.push("/login");
  }, [hasCheckedSession, isAuthenticated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lessonsApi.list();
      const lessonItems = data.lessons.filter(isLessonPageItem);
      const completedLessonItems = lessonItems.filter((lesson) => lesson.status === "completed").length;
      const totalLessonItems = lessonItems.length;

      setLessons(lessonItems);
      setCompleted(completedLessonItems);
      setTotal(totalLessonItems);
      setProgress(totalLessonItems ? Math.round((completedLessonItems / totalLessonItems) * 100) : 0);
      // Auto-select current lesson or first incomplete
      const current =
        lessonItems.find((l) => l.isCurrent) ||
        lessonItems.find((l) => l.status !== "completed") ||
        lessonItems[0] ||
        null;
      setSelected(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const markLessonCompleted = async (lessonKey: string) => {
    const target = lessons.find((lesson) => lesson.key === lessonKey);
    const alreadyCompleted = target?.status === "completed";

    await lessonsApi.markStatus(lessonKey, "completed");

    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.key === lessonKey ? { ...lesson, status: "completed" } : lesson
      )
    );
    setSelected((prev) =>
      prev && prev.key === lessonKey ? { ...prev, status: "completed" } : prev
    );

    if (!alreadyCompleted) {
      setCompleted((current) => {
        const next = Math.min(total, current + 1);
        setProgress(total ? Math.round((next / total) * 100) : 0);
        return next;
      });
    }
  };

  const handleMarkComplete = async () => {
    if (!selected) return;
    setMarking(true);
    try {
      await markLessonCompleted(selected.key);
    } catch {
      // non-fatal; user can try again
    } finally {
      setMarking(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!hasCheckedSession || !isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Header */}
      <div className="border-b bg-card px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-1">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mb-3">
            {t("progressSummary", { completed, total })}
          </p>
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("progressPercent", { progress: progress.toFixed(0) })}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Lesson list */}
        <aside className="w-full lg:w-72 shrink-0">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
            {t("allLessons")}
          </h2>
          <ul className="space-y-1">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <button
                  onClick={() => setSelected(lesson)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selected?.id === lesson.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <StatusIcon status={lesson.status} />
                  <span className="text-sm flex-1 leading-snug">
                    {lessonTitle(t, lesson)}
                  </span>
                  {selected?.id === lesson.id && (
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Video player */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-4"
              >
                {/* Lesson content */}
                {selected.url && !isBackendRoute(selected.url) ? (
                  <div
                    className="relative w-full rounded-xl overflow-hidden bg-black"
                    style={{ paddingTop: "56.25%" }}
                  >
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={toEmbedUrl(selected.url)}
                      title={lessonTitle(t, selected)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : selected.url && getBackendLessonVideoUrl(selected.url) ? (
                  <div className="relative w-full rounded-xl overflow-hidden bg-black">
                    <video
                      className="w-full aspect-video"
                      controls
                      preload="metadata"
                      title={lessonTitle(t, selected)}
                    >
                      <source src={getBackendLessonVideoUrl(selected.url) ?? ""} type="video/mp4" />
                      {t("videoUnsupported")}
                    </video>
                  </div>
                ) : selected.url === "/gamepage" ? (
                  <QuizPracticeActivity
                    lessonKey={selected.key}
                    onCompleted={() => markLessonCompleted(selected.key)}
                  />
                ) : selected.url ? (
                  <div className="relative w-full rounded-xl border bg-muted/40 p-8 min-h-[320px] flex flex-col items-center justify-center text-center gap-4">
                    <PlayCircle className="w-16 h-16 text-primary/70" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {t("backendLessonTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        {t("backendLessonBody")}
                      </p>
                    </div>
                    <Button asChild className="gap-2">
                      <a href={backendPath(selected.url)}>
                        {t("openLessonFlow")}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div
                    className="relative w-full rounded-xl bg-muted"
                    style={{ paddingTop: "56.25%" }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                      {t("noVideo")}
                    </span>
                  </div>
                )}

                {/* Info + actions */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {lessonTitle(t, selected)}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                      {statusLabel(t, selected.status)}
                    </p>
                  </div>
                  {selected.status !== "completed" ? (
                    <Button
                      onClick={handleMarkComplete}
                      disabled={marking}
                      className="gap-2 shrink-0"
                    >
                      {marking ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {t("markComplete")}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {t("completed")}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-muted-foreground"
              >
                <PlayCircle className="w-16 h-16 mb-4 opacity-30" />
                <p>{t("empty")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
