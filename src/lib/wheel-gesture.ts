/**
 * Two-finger touchpad swipes, read from `wheel` events.
 *
 * The browser has no touchpad gesture events, only a stream of wheel deltas,
 * but the stream has a shape (as recorded from Chrome on Windows, see
 * tests/fixtures/wheel-*.json):
 *
 * 1. While the fingers move: deltas that follow them, getting very large
 *    (thousands of px in one event) on a quick flick just before lifting.
 * 2. When the fingers lift: one event with no delta at all.
 * 3. Momentum: seconds of deltas that decay slowly from roughly the lift
 *    speed. A new swipe can start in the middle of it.
 *
 * `createWheelGesture` turns that stream into what a pager needs: the
 * fingers' movement, the moment they lift, and nothing for the momentum,
 * which belongs to the OS rather than the user. When the lift isn't marked
 * (other platforms may not send the empty event), a pause ends the gesture.
 * The machine is pure, fed plain numbers, so recordings replay in tests.
 */

import { gestureLog } from './gesture-log';

/** Content that handles its own sideways gestures (or scrolls sideways). */
export const OWN_GESTURES = 'pre, table, input, textarea, [contenteditable="true"], [data-no-swipe]';

/** A pause this long (ms) between wheel events means the gesture is over. */
export const WHEEL_GESTURE_GAP = 120;
/** Travel (px) before a gesture is read as horizontal or vertical. */
const WHEEL_AXIS_LOCK = 6;
/**
 * Momentum speed is averaged over the events of this window (ms), each one's
 * movement spread over the time since the one before it. So events that
 * bunch up after a busy frame, or that the browser merges into one, don't
 * look like a sudden push. The first momentum event (often a large
 * catch-up) is out of the window before any comparison is made.
 */
const SPEED_WINDOW = 50;
/** A new swipe during momentum moves this many times faster than its slowest point… */
const NEW_SWIPE_SPEEDUP = 2.5;
/** …and at least this much faster (px/ms). */
const NEW_SWIPE_MIN_GAIN = 1;
/** Opposite movement (px) during momentum that counts as a swipe back. */
const REVERSAL_PX = 4;
/** Pixels per line / page for wheels that report in those units. */
const LINE_PX = 16;
const PAGE_PX = 400;

export type WheelGestureAction =
  /** Not a horizontal gesture: let the browser scroll as usual. */
  | { type: 'none' }
  /** Part of a horizontal gesture with nothing to do (momentum). */
  | { type: 'claim' }
  /**
   * The fingers moved the content by `delta` px (negative towards what comes
   * next, like a touch drag to the left). `start` marks a new gesture.
   */
  | { type: 'move'; delta: number; start: boolean }
  /** The fingers lifted. */
  | { type: 'release' };

export interface WheelGesture {
  /** Feed one wheel event's deltas (px, signed like `WheelEvent.deltaX/Y`). */
  feed(dx: number, dy: number, t: number): WheelGestureAction;
  /** No event for WHEEL_GESTURE_GAP ms: ends whatever was going on. */
  idle(): WheelGestureAction;
}

export function createWheelGesture(): WheelGesture {
  let state: 'idle' | 'pending' | 'vertical' | 'drag' | 'momentum' = 'idle';
  let lastT = -Infinity;
  let sumX = 0;
  let sumY = 0;
  // Momentum: the direction of the swipe it follows, its recent movement
  // (time, px along that direction, ms since the previous event) and its
  // slowest speed so far.
  let releaseSign = 0;
  let samples: { t: number; along: number; dt: number }[] = [];
  let momentumFrom = 0;
  let slowest = Infinity;

  function release(): WheelGestureAction {
    state = 'momentum';
    samples = [];
    slowest = Infinity;
    return { type: 'release' };
  }

  function startDrag(delta: number): WheelGestureAction {
    state = 'drag';
    releaseSign = Math.sign(delta) || releaseSign;
    return { type: 'move', delta, start: true };
  }

  /** Whether a momentum event is really the fingers starting a new swipe. */
  function newSwipe(dx: number, t: number, dt: number): boolean {
    const along = -dx * releaseSign; // positive: same way as the last swipe
    if (along <= -REVERSAL_PX) return true;
    if (samples.length === 0) momentumFrom = t;
    samples.push({ t, along: Math.max(along, 0), dt });
    if (t - momentumFrom < SPEED_WINDOW) return false;
    samples = samples.filter((s) => s.t > t - SPEED_WINDOW);
    const moved = samples.reduce((sum, s) => sum + s.along, 0);
    const took = samples.reduce((sum, s) => sum + s.dt, 0);
    const speed = moved / Math.max(took, 1);
    if (speed >= Math.max(slowest * NEW_SWIPE_SPEEDUP, slowest + NEW_SWIPE_MIN_GAIN)) return true;
    slowest = Math.min(slowest, speed);
    return false;
  }

  return {
    feed(dx, dy, t) {
      const dt = t - lastT;
      lastT = t;
      if (dt > WHEEL_GESTURE_GAP && state !== 'idle') state = 'idle';
      const lift = dx === 0 && dy === 0;

      switch (state) {
        case 'idle':
          if (lift) return { type: 'none' };
          state = 'pending';
          sumX = sumY = 0;
        // falls through
        case 'pending': {
          if (lift) {
            state = 'idle';
            return { type: 'none' };
          }
          sumX += dx;
          sumY += dy;
          if (Math.abs(sumX) + Math.abs(sumY) < WHEEL_AXIS_LOCK) return { type: 'none' };
          if (Math.abs(sumY) >= Math.abs(sumX)) {
            state = 'vertical';
            return { type: 'none' };
          }
          return startDrag(-sumX);
        }
        case 'vertical':
          if (lift) state = 'idle';
          return { type: 'none' };
        case 'drag':
          if (lift) return release();
          return { type: 'move', delta: -dx, start: false };
        case 'momentum':
          // A lift here ended fingers we took for momentum; keep ignoring.
          if (lift) return release();
          if (newSwipe(dx, t, dt)) return startDrag(-dx);
          return { type: 'claim' };
      }
    },
    idle() {
      const wasDrag = state === 'drag';
      state = 'idle';
      return wasDrag ? { type: 'release' } : { type: 'none' };
    },
  };
}

function wheelPixels(delta: number, mode: number): number {
  if (mode === 1) return delta * LINE_PX; // WheelEvent.DOM_DELTA_LINE
  if (mode === 2) return delta * PAGE_PX; // WheelEvent.DOM_DELTA_PAGE
  return delta;
}

/** Whether something between `target` and `node` can scroll sideways itself. */
function scrollsSideways(target: Element | null, node: HTMLElement): boolean {
  for (let el = target; el && el !== node; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth) {
      const overflow = getComputedStyle(el).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
  }
  return false;
}

/**
 * A wheel event's deltas in px, or null when it isn't ours to handle: a pinch
 * (Ctrl+wheel, also the zoom shortcut), or a sideways move over content that
 * scrolls sideways on its own. Shift turns a plain mouse wheel sideways in
 * most browsers but not all, so it is done here when the browser didn't.
 */
export function readWheel(e: WheelEvent, node: HTMLElement): { dx: number; dy: number } | null {
  if (e.ctrlKey) return null;
  let dx = wheelPixels(e.deltaX, e.deltaMode);
  let dy = wheelPixels(e.deltaY, e.deltaMode);
  if (e.shiftKey && dx === 0) [dx, dy] = [dy, 0];
  const target = e.target as Element | null;
  if (dx !== 0 && (target?.closest(OWN_GESTURES) || scrollsSideways(target, node))) return null;
  return { dx, dy };
}

/**
 * Attach a wheel gesture to `node`: `onaction` gets every action, already
 * claimed (default prevented, so the browser doesn't scroll or navigate back
 * as well) when it is part of a horizontal gesture. Returns the cleanup.
 */
export function listenWheelGesture(
  node: HTMLElement,
  enabled: () => boolean,
  onaction: (action: WheelGestureAction, t: number) => void,
): () => void {
  const gesture = createWheelGesture();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const onIdle = () => {
    timer = undefined;
    const action = gesture.idle();
    gestureLog.record('wheel-idle', { action: action.type });
    if (action.type !== 'none') onaction(action, performance.now());
  };

  const onWheel = (e: WheelEvent) => {
    gestureLog.record(
      'wheel',
      { dx: e.deltaX, dy: e.deltaY, mode: e.deltaMode, ctrl: e.ctrlKey, shift: e.shiftKey },
      e.timeStamp,
    );
    if (!enabled()) return;
    const delta = readWheel(e, node);
    if (!delta) return;
    clearTimeout(timer);
    timer = setTimeout(onIdle, WHEEL_GESTURE_GAP);
    const action = gesture.feed(delta.dx, delta.dy, e.timeStamp);
    if (action.type === 'release' || (action.type === 'move' && action.start)) {
      gestureLog.record(action.type === 'release' ? 'release' : 'start', {}, e.timeStamp);
    }
    if (action.type !== 'none') e.preventDefault();
    onaction(action, e.timeStamp);
  };

  // Not passive: claiming a horizontal gesture needs preventDefault().
  node.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    clearTimeout(timer);
    node.removeEventListener('wheel', onWheel);
  };
}
