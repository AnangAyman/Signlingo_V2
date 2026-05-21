/**
 * Animates a number from `start` to `end` over `duration` ms using a cubic
 * ease-out curve. Calls `onUpdate` on every animation frame and `onComplete`
 * when finished. Returns a cancel function.
 */
export function animateNumber(
  start: number,
  end: number,
  duration: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void
): () => void {
  if (start === end) {
    onUpdate(end);
    onComplete?.();
    return () => {};
  }

  let animFrameId: number;
  const startTime = performance.now();

  const tick = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Cubic ease-out
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(Math.round(start + (end - start) * eased));

    if (t < 1) {
      animFrameId = requestAnimationFrame(tick);
    } else {
      onComplete?.();
    }
  };

  animFrameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(animFrameId);
}
