import { describe, expect, it } from 'vitest';
import {
  DISMISS_DISTANCE,
  edgeResistance,
  PAGE_COMMIT_FRACTION,
  pageDecision,
  settleDuration,
  shouldDismiss,
} from '../src/lib/gestures';

describe('edgeResistance', () => {
  it('moves a fraction of the drag past the last page, in its direction', () => {
    expect(edgeResistance(-40, 400)).toBe(-10);
    expect(edgeResistance(40, 400)).toBe(10);
  });

  it('never moves far enough to show the blank beyond', () => {
    expect(edgeResistance(-400, 400)).toBe(-50);
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
