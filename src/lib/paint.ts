/**
 * Resolve once the browser has painted the current state. Heavy synchronous
 * work (serializing a multi-megabyte diary) blocks the main thread, so a
 * "Saving…" label set just before it would never appear; await this first.
 * Falls back to a timer where frames don't run (a hidden tab).
 */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    const fallback = setTimeout(resolve, 100);
    requestAnimationFrame(() =>
      setTimeout(() => {
        clearTimeout(fallback);
        resolve();
      }, 0),
    );
  });
}
