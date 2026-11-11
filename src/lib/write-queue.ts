/**
 * Run `write` one call at a time, so a slow older write can never land after
 * a newer one. Calls made while a write runs share a single follow-up write,
 * which reads the state as it is when it starts: a burst of quick changes
 * (tapping through a day's habits) costs at most two writes.
 */
export interface WriteQueue<T> {
  /** Write now, or in the follow-up write if one is running. */
  run(): Promise<T>;
  /** Settles once every write asked for so far has finished, failed or not. */
  idle(): Promise<void>;
}

export function createWriteQueue<T>(write: () => Promise<T>): WriteQueue<T> {
  let running: Promise<T> | null = null;
  let queued: Promise<T> | null = null;

  const start = (): Promise<T> => {
    const run = write().finally(() => {
      if (running === run) running = null;
    });
    running = run;
    return run;
  };

  return {
    run() {
      if (queued) return queued;
      if (!running) return start();
      const next = running
        .catch(() => undefined)
        .then(() => {
          queued = null;
          return start();
        });
      queued = next;
      return next;
    },
    async idle() {
      // The follow-up only starts once the running write is done.
      await (queued ?? running)?.catch(() => undefined);
    },
  };
}
