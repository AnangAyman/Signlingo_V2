"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, PlayCircle, ChevronRight, RefreshCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function getBackendLessonVideoUrl(url: string): string | null {
  if (url === "/video_learning") {
    return backendPath("/static/Assets/Learn ASL Alphabet Video.mp4");
  }
  return null;
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
      setLessons(data.lessons);
      setCompleted(data.completed);
      setTotal(data.total);
      setProgress(data.progress);
      // Auto-select current lesson or first incomplete
      const current =
        data.lessons.find((l) => l.isCurrent) ||
        data.lessons.find((l) => l.status !== "completed") ||
        data.lessons[0] ||
        null;
      setSelected(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lessons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const handleMarkComplete = async () => {
    if (!selected) return;
    setMarking(true);
    try {
      await lessonsApi.markStatus(selected.key, "completed");
      // Optimistically update local state
      setLessons((prev) =>
        prev.map((l) => (l.id === selected.id ? { ...l, status: "completed" } : l))
      );
      setSelected((prev) => prev && { ...prev, status: "completed" });
      setCompleted((c) => {
        const next = c + 1;
        setProgress(Math.round((next / total) * 100));
        return next;
      });
    } catch {
      // non-fatal — user can try again
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
          <span>Loading lessons…</span>
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
            <RefreshCcw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-1">Video Lessons</h1>
          <p className="text-sm text-muted-foreground mb-3">
            {completed} of {total} lessons completed
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
          <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(0)}% complete</p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Lesson list */}
        <aside className="w-full lg:w-72 shrink-0">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
            All Lessons
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
                  <span className="text-sm flex-1 leading-snug">{lesson.title}</span>
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
                {/* Video embed */}
                {selected.url && !isBackendRoute(selected.url) ? (
                  <div
                    className="relative w-full rounded-xl overflow-hidden bg-black"
                    style={{ paddingTop: "56.25%" }}
                  >
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={toEmbedUrl(selected.url)}
                      title={selected.title}
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
                      title={selected.title}
                    >
                      <source src={getBackendLessonVideoUrl(selected.url) ?? ""} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : selected.url ? (
                  <div className="relative w-full rounded-xl border bg-muted/40 p-8 min-h-[320px] flex flex-col items-center justify-center text-center gap-4">
                    <PlayCircle className="w-16 h-16 text-primary/70" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        This lesson is served by the Django backend.
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        The current lesson flow still uses the migrated Django page,
                        so open it from the connected backend instead of embedding a
                        Vercel-local route.
                      </p>
                    </div>
                    <Button asChild className="gap-2">
                      <a href={backendPath(selected.url)}>
                        Open Lesson Flow
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
                      No video available for this lesson.
                    </span>
                  </div>
                )}

                {/* Info + actions */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{selected.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                      {selected.status.replace(/_/g, " ")}
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
                      Mark as Complete
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Completed
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
                <p>Select a lesson to start watching</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

