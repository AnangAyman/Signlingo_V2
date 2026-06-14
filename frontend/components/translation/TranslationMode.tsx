"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Languages,
  Loader2,
  Radio,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { translationApi } from "@/lib/api";

// MediaPipe Holistic landmark subset used by the GRU model. Ported verbatim
// from the legacy translation_mode.js so the keypoint vector stays identical
// to what the trained model expects (447 floats per frame).
const SELECTED_FACE_IDS = [
  0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 191,
  267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 415,
  46, 52, 53, 55, 65, 70, 105, 107, 276, 282, 283, 285, 295, 300, 334, 336,
  50, 118, 123, 137, 205, 206, 207, 212, 214, 216,
  280, 347, 352, 366, 425, 426, 427, 432, 434, 436,
];
const FRAME_VECTOR_LENGTH = 447;
const RECORDING_DURATION_MS = 1500;
const SAMPLE_FRAMES = 30;
const CONFIDENCE_THRESHOLD = 0.6;

const HOLISTIC_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic";
const CAMERA_UTILS_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

type Landmark = { x: number; y: number; z: number };
interface HolisticResults {
  poseLandmarks?: Landmark[];
  faceLandmarks?: Landmark[];
  leftHandLandmarks?: Landmark[];
  rightHandLandmarks?: Landmark[];
}

type StatusType = "idle" | "recording" | "predicting" | "correct" | "error";

/** Inject a script tag once and resolve when it has loaded. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.body.appendChild(script);
  });
}

/** Port of the legacy keypoint extraction + shoulder-normalization. */
function extractAndNormalizeKeypoints(results: HolisticResults): number[] {
  let cx = 0;
  let cy = 0;
  let cz = 0;
  let scale = 1;

  if (results.poseLandmarks) {
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    cx = (leftShoulder.x + rightShoulder.x) / 2;
    cy = (leftShoulder.y + rightShoulder.y) / 2;
    cz = (leftShoulder.z + rightShoulder.z) / 2;
    const shoulderDistance = Math.sqrt(
      (leftShoulder.x - rightShoulder.x) ** 2 +
        (leftShoulder.y - rightShoulder.y) ** 2 +
        (leftShoulder.z - rightShoulder.z) ** 2
    );
    if (shoulderDistance > 0) scale = shoulderDistance;
  }

  const normalize = (list: Landmark[] | undefined, isFace = false): number[] => {
    if (!list) {
      return new Array((isFace ? SELECTED_FACE_IDS.length : 21) * 3).fill(0);
    }
    const data: number[] = [];
    for (let index = 0; index < list.length; index += 1) {
      if (isFace && !SELECTED_FACE_IDS.includes(index)) continue;
      const lm = list[index];
      data.push((lm.x - cx) / scale, (lm.y - cy) / scale, (lm.z - cz) / scale);
    }
    return data;
  };

  let pose: number[];
  if (results.poseLandmarks) {
    pose = [];
    for (const lm of results.poseLandmarks) {
      pose.push((lm.x - cx) / scale, (lm.y - cy) / scale, (lm.z - cz) / scale);
    }
  } else {
    pose = new Array(33 * 3).fill(0);
  }

  const face = normalize(results.faceLandmarks, true);
  const leftHand = normalize(results.leftHandLandmarks, false);
  const rightHand = normalize(results.rightHandLandmarks, false);

  return [...pose, ...face, ...leftHand, ...rightHand];
}

export function TranslationMode() {
  const { t, i18n } = useTranslation("translation");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const holisticRef = useRef<{ close: () => void } | null>(null);
  const cameraRef = useRef<{ stop: () => void } | null>(null);

  // Recording state lives in refs so the Holistic onResults callback (set up
  // once) always reads the current values without stale closures.
  const isRecordingRef = useRef(false);
  const bufferRef = useRef<number[][]>([]);
  const recordStartRef = useRef(0);

  const [modelLoading, setModelLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusType>("idle");
  const [statusDetail, setStatusDetail] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [translated, setTranslated] = useState("");
  const [localized, setLocalized] = useState("");
  const [translating, setTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePrediction = useCallback(
    (result: string, confidence: number) => {
      const pct = Math.round(confidence * 100);
      if (confidence > CONFIDENCE_THRESHOLD) {
        setStatus("correct");
        setStatusDetail(`${result} (${pct}%)`);
        setWords((prev) => [...prev, result]);
      } else {
        setStatus("error");
        setStatusDetail(`${result} (${pct}%) · ${t("status.tooLow")}`);
      }
      window.setTimeout(() => {
        if (!isRecordingRef.current) {
          setStatus("idle");
          setStatusDetail("");
        }
      }, 2000);
    },
    [t]
  );

  const sendForPrediction = useCallback(
    async (sequence: number[][]) => {
      setStatus("predicting");
      setStatusDetail("");
      try {
        const data = await translationApi.predictGru(sequence);
        handlePrediction(data.result, data.confidence);
      } catch {
        setStatus("error");
        setStatusDetail(t("status.error"));
      }
    },
    [handlePrediction, t]
  );

  const onResults = useCallback(
    (results: HolisticResults) => {
      if (!isRecordingRef.current) return;
      bufferRef.current.push(extractAndNormalizeKeypoints(results));
      const elapsed = performance.now() - recordStartRef.current;
      if (elapsed < RECORDING_DURATION_MS) return;

      isRecordingRef.current = false;

      // Evenly sample SAMPLE_FRAMES frames out of the recorded buffer.
      const buffer = bufferRef.current;
      const total = buffer.length;
      const sampled: number[][] = [];
      if (total > 0) {
        for (let i = 0; i < SAMPLE_FRAMES; i += 1) {
          const frameIndex = total === 1 ? 0 : Math.floor((i / (SAMPLE_FRAMES - 1)) * (total - 1));
          sampled.push(buffer[frameIndex]);
        }
      } else {
        for (let i = 0; i < SAMPLE_FRAMES; i += 1) {
          sampled.push(new Array(FRAME_VECTOR_LENGTH).fill(0));
        }
      }
      bufferRef.current = [];
      void sendForPrediction(sampled);
    },
    [sendForPrediction]
  );

  // Load MediaPipe, wire up Holistic + Camera once on mount.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadScript(`${HOLISTIC_CDN}/holistic.js`);
        await loadScript(CAMERA_UTILS_CDN);
        if (cancelled) return;

        const win = window as unknown as {
          Holistic: new (config: { locateFile: (f: string) => string }) => {
            setOptions: (o: Record<string, unknown>) => void;
            onResults: (cb: (r: HolisticResults) => void) => void;
            send: (input: { image: HTMLVideoElement }) => Promise<void>;
            close: () => void;
          };
          Camera: new (
            video: HTMLVideoElement,
            opts: { onFrame: () => Promise<void>; width: number; height: number }
          ) => { start: () => void; stop: () => void };
        };

        const holistic = new win.Holistic({
          locateFile: (file) => `${HOLISTIC_CDN}/${file}`,
        });
        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          refineFaceLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        holistic.onResults(onResults);
        holisticRef.current = holistic;

        if (!videoRef.current) return;
        const camera = new win.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) await holistic.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });
        camera.start();
        cameraRef.current = camera;

        if (!cancelled) setModelLoading(false);
      } catch {
        if (!cancelled) {
          setModelLoading(false);
          setLoadError(t("errors.modelLoadFailed"));
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      isRecordingRef.current = false;
      try {
        cameraRef.current?.stop();
      } catch {
        /* ignore */
      }
      try {
        holisticRef.current?.close();
      } catch {
        /* ignore */
      }
    };
    // Mount only — onResults is stable for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(() => {
    if (isRecordingRef.current || modelLoading || loadError) return;
    bufferRef.current = [];
    recordStartRef.current = performance.now();
    isRecordingRef.current = true;
    setStatus("recording");
    setStatusDetail("");
  }, [modelLoading, loadError]);

  // Space bar triggers a recording, matching the legacy UX.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        startRecording();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startRecording]);

  const removeWord = (index: number) => {
    setWords((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setWords([]);
    setTranslated("");
    setLocalized("");
    setErrorMsg(null);
  };

  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) {
        setErrorMsg(t("errors.ttsUnsupported"));
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    },
    [t]
  );

  const handleTranslate = async () => {
    if (words.length === 0) {
      setErrorMsg(t("errors.recordFirst"));
      return;
    }
    setErrorMsg(null);
    setTranslating(true);
    setTranslated("");
    setLocalized("");
    try {
      const target = (i18n.language || "en").slice(0, 2);
      const data = await translationApi.translateSequence(words, target);
      if (data.translated) {
        setTranslated(data.translated);
        setLocalized(data.localized ?? "");
        speak(data.translated);
      } else {
        setErrorMsg(t("errors.translationFailed"));
      }
    } catch {
      setErrorMsg(t("errors.translationFailed"));
    } finally {
      setTranslating(false);
    }
  };

  const statusColor =
    status === "correct"
      ? "text-green-600"
      : status === "error"
      ? "text-destructive"
      : status === "recording"
      ? "text-red-500"
      : "text-muted-foreground";

  const statusLabel =
    status === "recording"
      ? t("status.recording")
      : status === "predicting"
      ? t("status.predicting")
      : statusDetail || t("status.ready");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          {t("badge")}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ── Camera column ── */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
              {/* Mirror the preview for a natural selfie view. */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full -scale-x-100 object-cover"
              />

              {modelLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  {t("camera.loadingModel")}
                </div>
              )}

              {status === "recording" && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  {t("status.recording")}
                </div>
              )}

              {/* Live prediction status overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className={`text-center text-sm font-bold ${statusColor} drop-shadow`}>
                  <span className="text-white/90">{statusLabel}</span>
                </p>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              {t("camera.recordHint")}
            </p>

            <Button
              onClick={startRecording}
              disabled={modelLoading || !!loadError || status === "recording"}
              className="mt-3 w-full gap-2"
              size="lg"
            >
              <Radio className="h-4 w-4" />
              {status === "recording" ? t("buttons.recording") : t("buttons.record")}
            </Button>
          </CardContent>
        </Card>

        {/* ── Transcript + translation column ── */}
        <div className="flex flex-col gap-5">
          {/* Recognized words */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("words.title")}
                </h2>
                {words.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-muted-foreground">
                    <Trash2 className="h-4 w-4" />
                    {t("buttons.clear")}
                  </Button>
                )}
              </div>

              {words.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("words.empty")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {words.map((word, index) => (
                    <motion.span
                      key={`${word}-${index}`}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-sm font-semibold text-primary"
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => removeWord(index)}
                        aria-label={t("buttons.removeWord")}
                        className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary/20"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.span>
                  ))}
                </div>
              )}

              <Button
                onClick={handleTranslate}
                disabled={translating || words.length === 0}
                className="mt-4 w-full gap-2"
                size="lg"
              >
                {translating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                {translating ? t("buttons.translating") : t("buttons.translate")}
              </Button>
            </CardContent>
          </Card>

          {/* Translation result */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Languages className="h-4 w-4 text-violet-500" />
                  {t("result.title")}
                </h2>
                {translated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speak(translated)}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <Volume2 className="h-4 w-4" />
                    {t("buttons.speak")}
                  </Button>
                )}
              </div>

              {translated ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="rounded-lg bg-violet-500/5 px-4 py-3">
                    <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-violet-500/80">
                      {t("result.indonesianLabel")}
                    </p>
                    <p className="text-lg font-medium text-foreground">{translated}</p>
                  </div>
                  {localized && (
                    <div className="rounded-lg bg-muted/50 px-4 py-3">
                      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("result.localizedLabel")}
                      </p>
                      <p className="text-base font-medium text-foreground">{localized}</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("result.empty")}
                </p>
              )}

              {errorMsg && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
