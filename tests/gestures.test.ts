import { describe, expect, it } from 'vitest';
import {
  DISMISS_DISTANCE,
  PAGE_COMMIT_FRACTION,
  pageDecision,
  settleDuration,
  SWIPE_MAX_DURATION,
  SWIPE_MIN_DISTANCE,
  shouldDismiss,
  swipeDirection,
} from '../src/lib/gestures';

describe('swipeDirection', () => {
  it('reads a left swipe as "next" and a right swipe as "previous"', () => {
    expect(swipeDirection(-120, 10, 200)).toBe(1);
    expect(swipeDirection(120, -10, 200)).toBe(-1);
  });

  it('ignores short drags', () => {
    expect(swipeDirection(SWIPE_MIN_DISTANCE - 1, 0, 100)).toBe(0);
  });

  it('ignores mostly vertical movement, i.e. scrolling', () => {
    expect(swipeDirection(80, 70, 200)).toBe(0);
    expect(swipeDirection(-80, -200, 200)).toBe(0);
  });

  it('ignores slow drags', () => {
    expect(swipeDirection(-200, 0, SWIPE_MAX_DURATION + 1)).toBe(0);
  });
});

describe('shouldDismiss', () => {
  it('dismisses after a long enough pull', () => {
    expect(shouldDismiss(DISMISS_DISTANCE, 2000)).toBe(true);
    expect(shouldDismiss(DISMISS_DISTANCE - 1, 2000)).toBe(false);
  });

  it('dismisses on a quick flick even if short', () => {
    expect(shouldDismiss(40, 50)).toBe(true);
  });

  it('never dismisses when pushed upwards', () => {
    expect(shouldDismiss(-200, 10)).toBe(false);
    expect(shouldDismiss(0, 10)).toBe(false);
  });
});

describe('pageDecision', () => {
  const W = 400;
  it('turns the page after dragging past the commit fraction', () => {
    expect(pageDecision(-W * PAGE_COMMIT_FRACTION, W, 0)).toBe(1);
    expect(pageDecision(W * PAGE_COMMIT_FRACTION, W, 0)).toBe(-1);
  });

  it('springs back after a short, slow drag', () => {
    expect(pageDecision(-60, W, -0.1)).toBe(0);
  });

  it('turns the page on a quick flick even if short', () => {
    expect(pageDecision(-40, W, -0.8)).toBe(1);
  });

  it('ignores a flick against the drag direction', () => {
    expect(pageDecision(-40, W, 0.8)).toBe(0);
  });
});

describe('settleDuration', () => {
  it('is quicker for faster fingers, within bounds', () => {
    expect(settleDuration(300, 3)).toBe(140);
    expect(settleDuration(300, 0)).toBeLessThanOrEqual(320);
    expect(settleDuration(300, 1.5)).toBeLessThan(settleDuration(300, 0.5));
  });
});
