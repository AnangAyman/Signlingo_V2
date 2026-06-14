"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Camera,
  CheckCircle,
  CircleAlert,
  Gamepad2,
  Loader2,
  RefreshCcw,
  SkipForward,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  backendPath,
  gameApi,
  gamificationApi,
  type ApiMlQuestion,
  type ApiQuizQuestion,
} from "@/lib/api";

const TOTAL_ROUNDS = 10;
const CAMERA_PREP_SECONDS = 5;
const MAGIC_ALLOWED_LETTERS = "ABCDEFHIJLMOPQRSTUVWXZ";
const MAGIC_CONFIDENCE_THRESHOLD = 0.7;

interface MagicEnemy {
  id: number;
  word: string;
  balloons: string[];
  x: number;
  y: number;
  speed: number;
  boss: boolean;
}

interface ActivityProps {
  lessonKey: string;
  onCompleted: () => Promise<void> | void;
}

function assetUrl(path?: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return backendPath(path.startsWith("/") ? path : `/${path}`);
}

function roundProgress(round: number): number {
  return Math.min(100, Math.round((round / TOTAL_ROUNDS) * 100));
}

function localizeQuizQuestion(
  t: (key: string, options?: Record<string, unknown>) => string,
  question?: string
): string {
  if (!question) return t("activity.quiz.loadingQuestion");
  if (question === "Which Bisindo letter is shown above?") {
    return t("activity.quiz.questionPrompt", {
      defaultValue: "Which Bisindo letter is shown above?",
    });
  }
  return question;
}

function localizeCameraPrompt(
  t: (key: string, options?: Record<string, unknown>) => string,
  prompt?: string
): string {
  if (!prompt) return t("activity.camera.noPrompt");
  const match = /^Show Bisindo Letter\s+(.+)$/.exec(prompt);
  if (match) {
    return t("activity.camera.promptTemplate", {
      letter: match[1],
      defaultValue: `Show Bisindo Letter ${match[1]}`,
    });
  }
  return prompt;
}

async function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  t: (key: string, options?: Record<string, unknown>) => string
): Promise<Blob> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(t("activity.errors.cameraCanvasUnavailable"));

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.9);
  });

  if (!blob) throw new Error(t("activity.errors.cameraFrameCaptureFailed"));
  return blob;
}

function useCamera() {
  const { t } = useTranslation("lessons");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraReady(false);
      setCameraError(t("activity.errors.cameraUnavailableInBrowser"));
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch {
      setCameraReady(false);
      setCameraError(t("activity.errors.cameraPermissionRequired"));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    void startCamera().then(() => {
      if (cancelled) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraReady(false);
      }
    });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      throw new Error(t("activity.errors.cameraStarting"));
    }
    return captureFrame(videoRef.current, canvasRef.current, t);
  }, [t]);

  return { videoRef, canvasRef, cameraReady, cameraError, startCamera, capture };
}

function ActivityShell({
  icon,
  title,
  subtitle,
  round,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  round: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-lg">
      <CardContent className="p-0">
        <div className="border-b bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">
              {Math.min(round, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
            </Badge>
          </div>
          <Progress value={roundProgress(round)} className="mt-4 h-2" />
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </CardContent>
    </Card>
  );
}

function Feedback({
  value,
}: {
  value: { type: "correct" | "incorrect" | "info"; message: string } | null;
}) {
  if (!value) return null;

  const className =
    value.type === "correct"
      ? "border-green-500/30 bg-green-500/10 text-green-700"
      : value.type === "incorrect"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-primary/30 bg-primary/10 text-primary";

  return (
    <Alert className={className}>
      <CircleAlert className="h-4 w-4" />
      <AlertDescription>{value.message}</AlertDescription>
    </Alert>
  );
}

export function QuizPracticeActivity({ lessonKey, onCompleted }: ActivityProps) {
  const { t } = useTranslation("lessons");
  const [question, setQuestion] = useState<ApiQuizQuestion | null>(null);
  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "correct" | "incorrect" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setSelectedChoice(null);
    setFeedback(null);
    setError(null);

    try {
      setQuestion(await gameApi.getQuestion());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("activity.errors.quizLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadQuestion();
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [loadQuestion]);

  const finish = useCallback(
    async (finalCorrectCount: number) => {
      setFinishing(true);
      try {
        await gameApi.saveSessionResults({
          type: "game",
          xp: finalCorrectCount * 10,
          accuracy: (finalCorrectCount / TOTAL_ROUNDS) * 100,
          skipped: false,
        });
        await onCompleted();
        setFeedback({
          type: "correct",
          message: t("activity.quiz.complete", { count: finalCorrectCount, total: TOTAL_ROUNDS }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t("activity.errors.quizSaveFailed"));
      } finally {
        setFinishing(false);
      }
    },
    [onCompleted, t]
  );

  const handleAnswer = async (choice: string) => {
    if (!question || selectedChoice || finishing) return;

    setSelectedChoice(choice);
    try {
      const result = await gameApi.checkAnswer(choice, question.answer);
      const nextCorrectCount = correctCount + (result.result ? 1 : 0);
      const nextRound = round + 1;

      setCorrectCount(nextCorrectCount);
      setRound(nextRound);
      setFeedback({
        type: result.result ? "correct" : "incorrect",
        message: result.result
          ? t("activity.quiz.greatJob")
          : t("activity.quiz.correctAnswer", { answer: question.answer }),
      });

      if (nextRound >= TOTAL_ROUNDS) {
        timeoutRef.current = window.setTimeout(() => void finish(nextCorrectCount), 900);
      } else {
        timeoutRef.current = window.setTimeout(() => void loadQuestion(), 900);
      }
    } catch (err) {
      setSelectedChoice(null);
      setError(err instanceof Error ? err.message : t("activity.errors.quizCheckFailed"));
    }
  };

  const skip = async () => {
    setFinishing(true);
    try {
      await gameApi.saveSessionResults({ type: "game", xp: 0, accuracy: 0, skipped: true });
      setFeedback({ type: "info", message: t("activity.quiz.skipped") });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("activity.errors.quizSkipSaveFailed"));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <ActivityShell
      icon={<Gamepad2 className="h-5 w-5" />}
      title={t("activity.quiz.title")}
      subtitle={t("activity.quiz.subtitle")}
      round={round}
    >
      <div className="space-y-4">
        {error && <Feedback value={{ type: "incorrect", message: error }} />}
        <Feedback value={feedback} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border bg-muted/30 p-4">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : question?.image ? (
              <img
                src={assetUrl(question.image)}
                alt={t("activity.quiz.imageAlt")}
                className="max-h-[300px] max-w-full rounded-lg object-contain"
              />
            ) : (
              <Sparkles className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-3">
            <p className="text-base font-semibold text-foreground">
              {localizeQuizQuestion(t, question?.question)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(question?.choices || []).map((choice) => {
                const isSelected = selectedChoice === choice;
                const isCorrect = feedback && choice === question?.answer;
                return (
                  <Button
                    key={choice}
                    variant={isSelected || isCorrect ? "default" : "outline"}
                    className="h-12 text-base"
                    disabled={loading || Boolean(selectedChoice) || finishing}
                    onClick={() => void handleAnswer(choice)}
                  >
                    {choice}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => void loadQuestion()} disabled={loading || finishing}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t("activity.quiz.reload")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void skip()} disabled={finishing}>
                <SkipForward className="mr-2 h-4 w-4" />
                {t("activity.quiz.skip")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ActivityShell>
  );
}

export function CameraPracticeActivity({ lessonKey, onCompleted }: ActivityProps) {
  const { videoRef, canvasRef, cameraReady, cameraError, startCamera, capture } = useCamera();
  const { t } = useTranslation("lessons");
  const [question, setQuestion] = useState<ApiMlQuestion | null>(null);
  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ type: "correct" | "incorrect" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const captureTimeoutRef = useRef<number | null>(null);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    setError(null);
    try {
      setQuestion(await gameApi.getMlQuestion());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("activity.errors.cameraPromptLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadQuestion();
    return () => {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      if (captureTimeoutRef.current) window.clearTimeout(captureTimeoutRef.current);
    };
  }, [loadQuestion]);

  const finish = useCallback(
    async (finalCorrectCount: number) => {
      setFinishing(true);
      try {
        await gameApi.saveSessionResults({
          type: "ml",
          xp: finalCorrectCount * 10,
          accuracy: (finalCorrectCount / TOTAL_ROUNDS) * 100,
          skipped: false,
        });
        await onCompleted();
        setFeedback({
          type: "correct",
          message: t("activity.camera.complete", { count: finalCorrectCount, total: TOTAL_ROUNDS }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t("activity.errors.cameraSaveFailed"));
      } finally {
        setFinishing(false);
      }
    },
    [onCompleted, t]
  );

  const capturePrediction = async () => {
    if (!question || predicting || finishing || prepCountdown !== null) return;

    setPredicting(true);
    setPrepCountdown(null);
    setError(null);
    try {
      const blob = await capture();
      const prediction = await gameApi.predict(blob);
      const isCorrect = prediction.result === question.answer;
      const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
      const nextRound = round + 1;

      setCorrectCount(nextCorrectCount);
      setRound(nextRound);
      setFeedback({
        type: isCorrect ? "correct" : "incorrect",
        message: isCorrect
          ? t("activity.camera.detectedCorrect", { result: prediction.result })
          : t("activity.camera.detectedIncorrect", {
              result: prediction.result,
              answer: question.answer,
            }),
      });

      if (nextRound >= TOTAL_ROUNDS) {
        await finish(nextCorrectCount);
      } else {
        await loadQuestion();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("activity.errors.predictionFailed"));
    } finally {
      setPredicting(false);
    }
  };

  const startPreparedCapture = async () => {
    if (!cameraReady) {
      await startCamera();
      return;
    }
    if (!question || predicting || finishing || prepCountdown !== null) return;

    setError(null);
    setFeedback({
      type: "info",
      message: t("activity.camera.countdown", { seconds: CAMERA_PREP_SECONDS }),
    });
    setPrepCountdown(CAMERA_PREP_SECONDS);

    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    if (captureTimeoutRef.current) window.clearTimeout(captureTimeoutRef.current);

    countdownIntervalRef.current = window.setInterval(() => {
      setPrepCountdown((current) => {
        if (current === null) return null;
        const next = current - 1;
        return next > 0 ? next : 0;
      });
    }, 1000);

    captureTimeoutRef.current = window.setTimeout(() => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      void capturePrediction();
    }, CAMERA_PREP_SECONDS * 1000);
  };

  return (
    <ActivityShell
      icon={<Camera className="h-5 w-5" />}
      title={t("activity.camera.title")}
      subtitle={t("activity.camera.subtitle")}
      round={round}
    >
      <div className="space-y-4">
        {(error || cameraError) && (
          <Feedback value={{ type: "incorrect", message: error || cameraError || "" }} />
        )}
        <Feedback value={feedback} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
          <div className="overflow-hidden rounded-lg border bg-black">
            <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} width={224} height={224} className="hidden" />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("activity.camera.targetSign")}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {loading
                  ? t("activity.camera.loadingPrompt")
                  : localizeCameraPrompt(t, question?.question)}
              </p>
            </div>
            {prepCountdown !== null && (
              <div className="rounded-lg border bg-primary/10 p-4 text-center text-primary">
                <p className="text-sm font-semibold uppercase tracking-[0.18em]">{t("activity.camera.getReady")}</p>
                <p className="mt-1 text-5xl font-black">{prepCountdown}</p>
              </div>
            )}
            <Button
              className="w-full"
              disabled={(cameraReady && !question) || predicting || finishing || prepCountdown !== null}
              onClick={() => void startPreparedCapture()}
            >
              {predicting || prepCountdown !== null ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {cameraReady
                ? prepCountdown !== null
                  ? t("activity.camera.preparing")
                  : t("activity.camera.captureSign")
                : t("activity.camera.enableCamera")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void loadQuestion()}
              disabled={loading || predicting || prepCountdown !== null}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t("activity.camera.newPrompt")}
            </Button>
          </div>
        </div>
      </div>
    </ActivityShell>
  );
}

export function MagicTouchPracticeActivity({ lessonKey, onCompleted }: ActivityProps) {
  const { videoRef, canvasRef, cameraReady, cameraError, startCamera, capture } = useCamera();
  const { t } = useTranslation("lessons");
  const [playing, setPlaying] = useState(false);
  const [enemies, setEnemies] = useState<MagicEnemy[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [defeated, setDefeated] = useState(0);
  const [lastPrediction, setLastPrediction] = useState<{ letter: string; confidence: number } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "correct" | "incorrect" | "info"; message: string } | null>({
    type: "info",
    message: t("activity.magicTouch.startRound"),
  });
  const [predicting, setPredicting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextIdRef = useRef(1);
  const predictionInFlightRef = useRef(false);

  const finish = useCallback(
    async (finalScore: number) => {
      setFinishing(true);
      try {
        await gameApi.saveSessionResults({
          type: "ml",
          xp: finalScore,
          accuracy: Math.min(100, finalScore),
          skipped: false,
        });
        // Persist the best Magic Touch score for the leaderboard.
        await gamificationApi.saveGameScore(finalScore);
        await onCompleted();
        setFeedback({
          type: "correct",
          message: t("activity.magicTouch.saved", { score: finalScore }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t("activity.errors.magicTouchSaveFailed"));
      } finally {
        setFinishing(false);
      }
    },
    [onCompleted, t]
  );

  const makeEnemy = useCallback((): MagicEnemy => {
    const boss = Math.random() < 0.22;
    const length = boss ? Math.floor(Math.random() * 3) + 2 : 1;
    let word = "";

    for (let index = 0; index < length; index += 1) {
      word += MAGIC_ALLOWED_LETTERS[Math.floor(Math.random() * MAGIC_ALLOWED_LETTERS.length)];
    }

    return {
      id: nextIdRef.current++,
      word,
      balloons: word.split(""),
      x: Math.floor(Math.random() * 72) + 8,
      y: -12,
      speed: boss ? 0.18 : 0.24,
      boss,
    };
  }, []);

  const reset = useCallback(() => {
    nextIdRef.current = 1;
    setEnemies([]);
    setScore(0);
    setLives(3);
    setDefeated(0);
    setLastPrediction(null);
    setError(null);
    setFeedback({
      type: "info",
      message: t("activity.magicTouch.startRound"),
    });
    setPlaying(false);
  }, [t]);

  const startGame = useCallback(() => {
    nextIdRef.current = 1;
    setEnemies([makeEnemy()]);
    setScore(0);
    setLives(3);
    setDefeated(0);
    setLastPrediction(null);
    setError(null);
    setFeedback({ type: "info", message: t("activity.magicTouch.startHint") });
    setPlaying(true);
  }, [makeEnemy, t]);

  const applyPrediction = useCallback((letter: string, confidence: number) => {
    setLastPrediction({ letter, confidence });

    if (confidence < MAGIC_CONFIDENCE_THRESHOLD) {
      setFeedback({
        type: "info",
        message: t("activity.magicTouch.lowConfidence", {
          letter,
          confidence: Math.round(confidence * 100),
        }),
      });
      return;
    }

    let hit = false;
    let clearedEnemy = false;

    // flushSync forces the enemies updater to run synchronously so the `hit` /
    // `clearedEnemy` flags it sets are available immediately below. Without it
    // React defers the updater and the flags are still false when we read them,
    // so the score, defeated count, and feedback never update on a hit.
    flushSync(() => {
      setEnemies((current) => {
        const matchingEnemy = current
          .filter((enemy) => enemy.balloons[0] === letter)
          .sort((a, b) => b.y - a.y)[0];

        if (!matchingEnemy) return current;

        hit = true;
        return current.flatMap((enemy) => {
          if (enemy.id !== matchingEnemy.id) return [enemy];

          const remainingBalloons = enemy.balloons.slice(1);
          if (remainingBalloons.length === 0) {
            clearedEnemy = true;
            return [];
          }

          return [{ ...enemy, balloons: remainingBalloons }];
        });
      });
    });

    if (hit) {
      const points = clearedEnemy ? 20 : 10;
      setScore((current) => current + points);
      if (clearedEnemy) setDefeated((current) => current + 1);
      setFeedback({
        type: "correct",
        message: clearedEnemy
          ? t("activity.magicTouch.targetCleared", { letter })
          : t("activity.magicTouch.keepGoing", { letter }),
      });
    } else {
      setFeedback({
        type: "incorrect",
        message: t("activity.magicTouch.noMatchingTarget", { letter }),
      });
    }
  }, [t]);

  const checkTarget = useCallback(async () => {
    if (!playing || predicting || finishing || predictionInFlightRef.current) return;

    predictionInFlightRef.current = true;
    setPredicting(true);
    setError(null);
    try {
      const blob = await capture();
      const prediction = await gameApi.predict(blob);
      applyPrediction(prediction.result, prediction.confidence ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("activity.errors.predictionFailed"));
    } finally {
      predictionInFlightRef.current = false;
      setPredicting(false);
    }
  }, [applyPrediction, capture, finishing, playing, predicting, t]);

  useEffect(() => {
    if (!playing) return;

    const tick = window.setInterval(() => {
      setEnemies((current) => {
        const nextEnemies: MagicEnemy[] = [];
        let missed = 0;

        for (const enemy of current) {
          const nextEnemy = { ...enemy, y: enemy.y + enemy.speed };
          if (nextEnemy.y > 96) missed += 1;
          else nextEnemies.push(nextEnemy);
        }

        if (missed > 0) {
          setLives((currentLives) => {
            const nextLives = Math.max(0, currentLives - missed);
            if (nextLives === 0) {
              setPlaying(false);
              setFeedback({ type: "incorrect", message: t("activity.magicTouch.gameOver") });
            }
            return nextLives;
          });
        }

        return nextEnemies;
      });
    }, 50);

    return () => window.clearInterval(tick);
  }, [playing]);

  useEffect(() => {
    if (!playing) return;

    const spawn = window.setInterval(() => {
      setEnemies((current) => (current.length >= 8 ? current : [...current, makeEnemy()]));
    }, 2200);

    return () => window.clearInterval(spawn);
  }, [makeEnemy, playing]);

  useEffect(() => {
    if (!playing || !cameraReady) return;

    const loop = window.setInterval(() => {
      void checkTarget();
    }, 950);

    return () => window.clearInterval(loop);
  }, [cameraReady, checkTarget, playing]);

  const expectedLetter = useMemo(() => {
    return enemies
      .filter((enemy) => enemy.balloons.length > 0)
      .sort((a, b) => b.y - a.y)[0]?.balloons[0] ?? null;
  }, [enemies]);

  return (
    <ActivityShell
      icon={<Zap className="h-5 w-5" />}
      title={t("activity.magicTouch.title")}
      subtitle={t("activity.magicTouch.subtitle")}
      round={defeated}
    >
      <div className="space-y-4">
        {(error || cameraError) && (
          <Feedback value={{ type: "incorrect", message: error || cameraError || "" }} />
        )}
        <Feedback value={feedback} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          <div className="space-y-4">
            <div className="relative min-h-[420px] overflow-hidden rounded-lg border bg-gradient-to-b from-sky-50 to-background">
              <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
                <Badge variant="secondary">{t("activity.magicTouch.score", { score })}</Badge>
                <Badge variant="outline">{t("activity.magicTouch.lives", { lives })}</Badge>
                <Badge variant="outline">
                  {t("activity.magicTouch.target", { target: expectedLetter ?? "-" })}
                </Badge>
              </div>

              {!playing && enemies.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <Zap className="h-12 w-12 text-primary" />
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">{t("activity.magicTouch.readyTitle")}</h4>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      {t("activity.magicTouch.readyBody")}
                    </p>
                  </div>
                </div>
              )}

              {enemies.map((enemy) => (
                <motion.div
                  key={enemy.id}
                  className="absolute flex flex-col items-center gap-1"
                  style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}
                  animate={{ y: [0, enemy.boss ? 5 : 3, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <div className="flex gap-1">
                    {enemy.balloons.map((letter, index) => (
                      <div
                        key={`${enemy.id}-${letter}-${index}`}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-black shadow-sm ${
                          index === 0
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-amber-300 bg-amber-100 text-amber-800"
                        }`}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                  <div className="h-8 w-px bg-foreground/20" />
                  <div className={`h-8 w-10 rounded-b-full ${enemy.boss ? "bg-secondary" : "bg-muted-foreground"}`} />
                </motion.div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border bg-black">
              <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay playsInline muted />
              <canvas ref={canvasRef} width={224} height={224} className="hidden" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">{t("activity.magicTouch.currentPrediction")}</p>
              <p className="mt-1 text-4xl font-black text-foreground">
                {lastPrediction ? lastPrediction.letter : playing ? "..." : <Trophy className="mx-auto h-10 w-10 text-primary" />}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {lastPrediction
                  ? t("activity.magicTouch.confidence", { value: Math.round(lastPrediction.confidence * 100) })
                  : t("activity.magicTouch.predictionPlaceholder")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={cameraReady ? startGame : () => void startCamera()}
                disabled={playing || finishing}
              >
                {cameraReady ? t("activity.magicTouch.start") : t("activity.camera.enableCamera")}
              </Button>
              <Button variant="outline" onClick={reset} disabled={predicting || finishing}>
                {t("activity.magicTouch.restart")}
              </Button>
            </div>
            <Button
              className="w-full"
              disabled={!cameraReady || !playing || predicting || finishing}
              onClick={() => void checkTarget()}
            >
              {predicting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {t("activity.magicTouch.checkNow")}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={finishing || score === 0}
              onClick={() => void finish(score)}
            >
              {t("activity.magicTouch.saveScore")}
            </Button>
          </div>
        </div>
      </div>
    </ActivityShell>
  );
}
