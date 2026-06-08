"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  type ApiMlQuestion,
  type ApiQuizQuestion,
} from "@/lib/api";

const TOTAL_ROUNDS = 10;
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

async function captureFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<Blob> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Camera canvas is not available.");

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.9);
  });

  if (!blob) throw new Error("Could not capture a camera frame.");
  return blob;
}

function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraReady(false);
      setCameraError("Camera access is not available in this browser.");
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
      setCameraError("Camera permission is needed for this activity.");
    }
  }, []);

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
      throw new Error("Camera is still starting.");
    }
    return captureFrame(videoRef.current, canvasRef.current);
  }, []);

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
      setError(err instanceof Error ? err.message : "Could not load quiz question.");
    } finally {
      setLoading(false);
    }
  }, []);

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
          message: `Quiz complete. You answered ${finalCorrectCount} of ${TOTAL_ROUNDS} correctly.`,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save quiz progress.");
      } finally {
        setFinishing(false);
      }
    },
    [onCompleted]
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
        message: result.result ? "Great job." : `Correct answer: ${question.answer}`,
      });

      if (nextRound >= TOTAL_ROUNDS) {
        timeoutRef.current = window.setTimeout(() => void finish(nextCorrectCount), 900);
      } else {
        timeoutRef.current = window.setTimeout(() => void loadQuestion(), 900);
      }
    } catch (err) {
      setSelectedChoice(null);
      setError(err instanceof Error ? err.message : "Could not check answer.");
    }
  };

  const skip = async () => {
    setFinishing(true);
    try {
      await gameApi.saveSessionResults({ type: "game", xp: 0, accuracy: 0, skipped: true });
      setFeedback({ type: "info", message: "Quiz skipped. Progress was not marked complete." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save skipped quiz.");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <ActivityShell
      icon={<Gamepad2 className="h-5 w-5" />}
      title="Quiz Challenge"
      subtitle="Answer Bisindo letter questions without leaving the Next.js app."
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
                alt="Bisindo hand sign"
                className="max-h-[300px] max-w-full rounded-lg object-contain"
              />
            ) : (
              <Sparkles className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-3">
            <p className="text-base font-semibold text-foreground">
              {question?.question || "Loading question..."}
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
                Reload
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void skip()} disabled={finishing}>
                <SkipForward className="mr-2 h-4 w-4" />
                Skip
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
  const [question, setQuestion] = useState<ApiMlQuestion | null>(null);
  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ type: "correct" | "incorrect" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    setError(null);
    try {
      setQuestion(await gameApi.getMlQuestion());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load camera prompt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuestion();
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
          message: `Practice complete. You matched ${finalCorrectCount} of ${TOTAL_ROUNDS} signs.`,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save camera progress.");
      } finally {
        setFinishing(false);
      }
    },
    [onCompleted]
  );

  const capturePrediction = async () => {
    if (!question || predicting || finishing) return;

    setPredicting(true);
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
          ? `Detected ${prediction.result}. Great job.`
          : `Detected ${prediction.result}. Target was ${question.answer}.`,
      });

      if (nextRound >= TOTAL_ROUNDS) {
        await finish(nextCorrectCount);
      } else {
        await loadQuestion();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run prediction.");
    } finally {
      setPredicting(false);
    }
  };

  return (
    <ActivityShell
      icon={<Camera className="h-5 w-5" />}
      title="Show Your Signs"
      subtitle="Use the Django prediction API from a Next.js camera screen."
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
              <p className="text-sm font-medium text-muted-foreground">Target sign</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {loading ? "Loading..." : question?.question || "No prompt"}
              </p>
            </div>
            <Button
              className="w-full"
              disabled={(cameraReady && !question) || predicting || finishing}
              onClick={cameraReady ? () => void capturePrediction() : () => void startCamera()}
            >
              {predicting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {cameraReady ? "Capture Sign" : "Enable Camera"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => void loadQuestion()} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              New Prompt
            </Button>
          </div>
        </div>
      </div>
    </ActivityShell>
  );
}

export function MagicTouchPracticeActivity({ lessonKey, onCompleted }: ActivityProps) {
  const { videoRef, canvasRef, cameraReady, cameraError, startCamera, capture } = useCamera();
  const [playing, setPlaying] = useState(false);
  const [enemies, setEnemies] = useState<MagicEnemy[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [defeated, setDefeated] = useState(0);
  const [lastPrediction, setLastPrediction] = useState<{ letter: string; confidence: number } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "correct" | "incorrect" | "info"; message: string } | null>({
    type: "info",
    message: "Start the round. Falling targets pop when your hand sign matches their first letter.",
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
        await onCompleted();
        setFeedback({
          type: "correct",
          message: `Magic Touch saved. Final score: ${finalScore}.`,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save Magic Touch progress.");
      } finally {
        setFinishing(false);
      }
    },
    [onCompleted]
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
      message: "Start the round. Falling targets pop when your hand sign matches their first letter.",
    });
    setPlaying(false);
  }, []);

  const startGame = useCallback(() => {
    nextIdRef.current = 1;
    setEnemies([makeEnemy()]);
    setScore(0);
    setLives(3);
    setDefeated(0);
    setLastPrediction(null);
    setError(null);
    setFeedback({ type: "info", message: "Sign the first letter of the lowest falling target." });
    setPlaying(true);
  }, [makeEnemy]);

  const applyPrediction = useCallback((letter: string, confidence: number) => {
    setLastPrediction({ letter, confidence });

    if (confidence < MAGIC_CONFIDENCE_THRESHOLD) {
      setFeedback({
        type: "info",
        message: `Detected ${letter}, but confidence is ${Math.round(confidence * 100)}%. Hold the sign clearly.`,
      });
      return;
    }

    let hit = false;
    let clearedEnemy = false;

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

    if (hit) {
      const points = clearedEnemy ? 20 : 10;
      setScore((current) => current + points);
      if (clearedEnemy) setDefeated((current) => current + 1);
      setFeedback({
        type: "correct",
        message: clearedEnemy
          ? `Detected ${letter}. Target cleared.`
          : `Detected ${letter}. Keep going for the next letter.`,
      });
    } else {
      setFeedback({
        type: "incorrect",
        message: `Detected ${letter}, but no falling target starts with that letter right now.`,
      });
    }
  }, []);

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
      setError(err instanceof Error ? err.message : "Could not run prediction.");
    } finally {
      predictionInFlightRef.current = false;
      setPredicting(false);
    }
  }, [applyPrediction, capture, finishing, playing, predicting]);

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
              setFeedback({ type: "incorrect", message: "Game over. Save or restart your round." });
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
      title="Magic Touch"
      subtitle="Letters fall from the sky. Sign the first letter to pop each target."
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
                <Badge variant="secondary">Score {score}</Badge>
                <Badge variant="outline">Lives {lives}</Badge>
                <Badge variant="outline">
                  Target {expectedLetter ?? "-"}
                </Badge>
              </div>

              {!playing && enemies.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <Zap className="h-12 w-12 text-primary" />
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">Ready for Magic Touch?</h4>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      Targets fall from the top. The first letter in each target is the sign to make.
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
              <p className="text-sm text-muted-foreground">Current prediction</p>
              <p className="mt-1 text-4xl font-black text-foreground">
                {lastPrediction ? lastPrediction.letter : playing ? "..." : <Trophy className="mx-auto h-10 w-10 text-primary" />}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {lastPrediction ? `${Math.round(lastPrediction.confidence * 100)}% confidence` : "Camera prediction appears here"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={cameraReady ? startGame : () => void startCamera()}
                disabled={playing || finishing}
              >
                {cameraReady ? "Start" : "Enable Camera"}
              </Button>
              <Button variant="outline" onClick={reset} disabled={predicting || finishing}>
                Restart
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
              Check Sign Now
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={finishing || score === 0}
              onClick={() => void finish(score)}
            >
              Save Score
            </Button>
          </div>
        </div>
      </div>
    </ActivityShell>
  );
}
