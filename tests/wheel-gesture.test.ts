import { describe, expect, it } from 'vitest';
import fixture from './fixtures/wheel-windows-chrome.json';
import { pageDecision, smoothVelocity } from '../src/lib/gestures';
import {
  createWheelGesture,
  WHEEL_GESTURE_GAP,
  type WheelGestureAction,
} from '../src/lib/wheel-gesture';

type WheelEvents = number[][]; // [t, dx, dy]

/**
 * Replay wheel events the way `dragPager` handles them (idle timer included)
 * and return the pages turned, plus how far the track moved in total.
 */
function replay(events: WheelEvents, width = fixture.viewport.width) {
  const gesture = createWheelGesture();
  const pages: number[] = [];
  let travelled = 0;
  let drag: { dx: number; v: number; t: number } | null = null;
  const apply = (action: WheelGestureAction, t: number) => {
    if (action.type === 'move') {
      drag ??= { dx: 0, v: 0, t };
      drag.v = smoothVelocity(drag.v, action.delta, t - drag.t);
      drag.t = t;
      drag.dx = Math.max(-width, Math.min(width, drag.dx + action.delta));
      travelled += Math.abs(action.delta);
    } else if (action.type === 'release' && drag) {
      const dir = pageDecision(drag.dx, width, drag.v);
      if (dir) pages.push(dir);
      drag = null;
    }
  };
  let last = -Infinity;
  for (const [t, dx, dy] of events) {
    if (t - last > WHEEL_GESTURE_GAP) apply(gesture.idle(), last + WHEEL_GESTURE_GAP);
    apply(gesture.feed(dx, dy, t), t);
    last = t;
  }
  apply(gesture.idle(), last + WHEEL_GESTURE_GAP);
  return { pages, travelled };
}

const recorded = (label: string): WheelEvents =>
  fixture.gestures.find((g) => g.label === label)!.events;

describe('wheel gestures recorded on Chrome for Windows', () => {
  // One page per lift of the fingers, whatever the momentum does after it.
  it.each([
    ['gentle swipe', [-1]],
    ['fast swipe', [-1]],
    ['long swipe', [-1]],
    ['repeated swipes', [-1, -1, -1, -1, -1, -1]],
    ['weird', [1, -1, -1, -1, 1, 1, 1, 1, 1, -1]],
  ])('%s', (label, pages) => {
    expect(replay(recorded(label)).pages).toEqual(pages);
  });

  it('ignores the momentum after a lift', () => {
    const events = recorded('fast swipe');
    const lift = events.findIndex(([, dx, dy]) => dx === 0 && dy === 0);
    const fingers = events.slice(0, lift).reduce((sum, [, dx]) => sum + Math.abs(dx), 0);
    expect(replay(events).travelled).toBe(fingers);
  });
});

describe('createWheelGesture', () => {
  // Evenly spaced events (16ms apart) from `t0`.
  const frames = (deltas: [number, number][], t0 = 0): WheelEvents =>
    deltas.map(([dx, dy], i) => [t0 + i * 16, dx, dy]);

  it('leaves vertical scrolling alone', () => {
    const gesture = createWheelGesture();
    const actions = frames([[1, 20], [3, 30], [8, 25], [0, 0]]).map(([t, dx, dy]) => gesture.feed(dx, dy, t));
    expect(actions.every((a) => a.type === 'none')).toBe(true);
  });

  it('follows the fingers, negative towards what comes next', () => {
    const gesture = createWheelGesture();
    expect(gesture.feed(10, 0, 0)).toEqual({ type: 'move', delta: -10, start: true });
    expect(gesture.feed(5, 1, 16)).toEqual({ type: 'move', delta: -5, start: false });
    expect(gesture.feed(0, 0, 32)).toEqual({ type: 'release' });
  });

  it('releases after a pause when the browser does not mark the lift', () => {
    const gesture = createWheelGesture();
    gesture.feed(20, 0, 0);
    expect(gesture.idle()).toEqual({ type: 'release' });
    expect(gesture.idle()).toEqual({ type: 'none' });
  });

  it('starts a new swipe when the fingers go back during momentum', () => {
    const gesture = createWheelGesture();
    for (const [t, dx, dy] of frames([[30, 0], [40, 0], [0, 0], [60, 0], [50, 0]])) gesture.feed(dx, dy, t);
    expect(gesture.feed(-20, 0, 96)).toEqual({ type: 'move', delta: 20, start: true });
  });

  it('starts a new swipe when the fingers speed up during momentum', () => {
    const gesture = createWheelGesture();
    gesture.feed(30, 0, 0);
    const momentum: [number, number][] = [[0, 0], [60, 0], [50, 0], [45, 0], [40, 0], [38, 0]];
    for (const [t, dx, dy] of frames(momentum, 16)) {
      expect(gesture.feed(dx, dy, t).type).not.toBe('move');
    }
    expect(gesture.feed(400, 0, 16 + momentum.length * 16)).toMatchObject({ type: 'move', start: true });
  });
});
