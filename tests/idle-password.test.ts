import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchIdle } from '../src/lib/idle';
import { assessPassword } from '../src/lib/password';

describe('watchIdle', () => {
  afterEach(() => vi.useRealTimers());

  it('fires after inactivity, is postponed by input, and retries', () => {
    vi.useFakeTimers();
    const target = new EventTarget() as unknown as Window;
    const onIdle = vi.fn();
    const stop = watchIdle(target, 1000, onIdle);

    vi.advanceTimersByTime(800);
    target.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(800);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(onIdle).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(onIdle).toHaveBeenCalledTimes(2);

    stop();
    vi.advanceTimersByTime(5000);
    expect(onIdle).toHaveBeenCalledTimes(2);
  });
});

describe('assessPassword', () => {
  it('requires a minimum length and rewards passphrases', () => {
    expect(assessPassword('short').acceptable).toBe(false);
    expect(assessPassword('aaaaaaaaaaaaaaaa').strength).toBe('weak');
    expect(assessPassword('correct horse battery staple').strength).toBe('strong');
  });
});
