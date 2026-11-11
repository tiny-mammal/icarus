import { describe, expect, it } from 'vitest';
import { createWriteQueue } from '../src/lib/write-queue';

/** A write that waits until released, recording the state it saw. */
function controlledWrites() {
  const seen: number[] = [];
  const pending: (() => void)[] = [];
  let state = 0;
  const write = () =>
    new Promise<number>((resolve) => {
      const snapshot = state;
      pending.push(() => {
        seen.push(snapshot);
        resolve(snapshot);
      });
    });
  return {
    seen,
    set: (value: number) => (state = value),
    release: async () => {
      pending.shift()?.();
      await new Promise((r) => setTimeout(r));
    },
    write,
  };
}

describe('createWriteQueue', () => {
  it('runs one write at a time and coalesces a burst into one follow-up', async () => {
    const w = controlledWrites();
    const run = () => queue.run();
    const queue = createWriteQueue(w.write);
    w.set(1);
    const first = run();
    w.set(2);
    const second = run();
    w.set(3);
    const third = run();
    expect(second).toBe(third);

    await w.release();
    expect(await first).toBe(1);
    await w.release();
    // The follow-up started after the burst, so it saw the latest state.
    expect(await second).toBe(3);
    expect(w.seen).toEqual([1, 3]);
  });

  it('keeps going after a failed write', async () => {
    let fail = true;
    const queue = createWriteQueue(async () => {
      if (fail) throw new Error('disk full');
      return 'ok';
    });
    const run = () => queue.run();
    const failed = run();
    fail = false;
    await expect(failed).rejects.toThrow('disk full');
    expect(await run()).toBe('ok');
  });
});

describe('idle', () => {
  it('waits for the running write and the follow-up', async () => {
    const w = controlledWrites();
    const queue = createWriteQueue(w.write);
    void queue.run();
    void queue.run();
    let settled = false;
    const idle = queue.idle().then(() => (settled = true));
    await w.release();
    expect(settled).toBe(false);
    await w.release();
    await idle;
    expect(w.seen).toHaveLength(2);
  });

  it('settles straight away with nothing to write', async () => {
    await expect(createWriteQueue(async () => 1).idle()).resolves.toBeUndefined();
  });
});
