"use client";

import { useCallback } from "react";

/**
 * Plays an audio file at the given `src`. Falls back to a Web Audio API
 * beep if the file cannot be loaded (e.g. file missing in dev).
 */
export function useSoundEffect() {
  const play = useCallback((src: string) => {
    try {
      const audio = new Audio(src);
      audio.volume = 0.5;
      audio.play().catch(() => playBeep());
    } catch {
      playBeep();
    }
  }, []);

  return { play };
}

function playBeep(frequency = 880, durationSec = 0.15) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSec);
  } catch {
    // Silent failure — AudioContext not supported or blocked
  }
}
