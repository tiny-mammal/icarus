/**
 * Development-only recorder for touch and touchpad gestures. Open the dev
 * server with `?debug=gestures` and every wheel/pointer event the pagers see is
 * kept here, together with what the pager did with it and any slow frames, so
 * a real device's gestures can be downloaded and replayed in tests instead of
 * guessed. It records numbers and timings only, never diary content, and in
 * production builds `enabled` is constant false, so every call is a no-op.
 */
import { debugFlag } from './debug';

export type GestureLogEntry = {
  /** `performance.now()`-based time, same clock as `Event.timeStamp`. */
  t: number;
  kind: string;
} & Record<string, unknown>;

/** Enough for several minutes of swiping; older entries are dropped. */
const MAX_ENTRIES = 50_000;
/** Frames slower than this (ms) are logged as jank. */
const SLOW_FRAME_MS = 24;

const entries: GestureLogEntry[] = [];
const listeners = new Set<() => void>();

export const gestureLog = {
  enabled: debugFlag('gestures'),

  record(kind: string, data: Record<string, unknown> = {}, t = performance.now()): void {
    if (!this.enabled) return;
    entries.push({ t: Math.round(t * 10) / 10, kind, ...data });
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    for (const fn of listeners) fn();
  },

  get size(): number {
    return entries.length;
  },

  clear(): void {
    entries.length = 0;
    for (const fn of listeners) fn();
  },

  /** Be told whenever an entry is added or the log is cleared. */
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** The whole recording, with what's needed to make sense of it. */
  export(): string {
    return JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        devicePixelRatio: window.devicePixelRatio,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        entries,
      },
      null,
      0,
    );
  },
};

/** Log slow frames until the returned function is called. */
export function watchFrames(): () => void {
  let last = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const ms = now - last;
    if (ms > SLOW_FRAME_MS) gestureLog.record('frame', { ms: Math.round(ms) }, now);
    last = now;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
