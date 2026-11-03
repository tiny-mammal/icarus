/**
 * Inactivity detection for auto-lock. Input events only stamp the time of the
 * last activity (cheap enough for `pointermove`); a single timer checks the
 * stamp when the period could have run out. After `onIdle` fires the period
 * starts again, so a refused lock (e.g. a save in flight) is retried later.
 */
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;

export function watchIdle(
  target: Window,
  timeoutMs: number,
  onIdle: () => void,
  now: () => number = Date.now,
): () => void {
  let lastActivity = now();
  const touch = () => {
    lastActivity = now();
  };

  let timer: ReturnType<typeof setTimeout>;
  const check = () => {
    const remaining = lastActivity + timeoutMs - now();
    if (remaining <= 0) {
      onIdle();
      lastActivity = now();
      timer = setTimeout(check, timeoutMs);
    } else {
      timer = setTimeout(check, remaining);
    }
  };

  for (const event of ACTIVITY_EVENTS) {
    target.addEventListener(event, touch, { passive: true, capture: true });
  }
  timer = setTimeout(check, timeoutMs);

  return () => {
    clearTimeout(timer);
    for (const event of ACTIVITY_EVENTS) target.removeEventListener(event, touch, { capture: true });
  };
}
