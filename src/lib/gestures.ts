/**
 * Touch and touchpad gestures: horizontal swipes (one finger on a screen, two
 * on a touchpad) that page through months or days, and the drag-down that
 * dismisses a bottom sheet. All are Svelte actions; the thresholds live in
 * pure helpers so they can be tested.
 */

import { gestureLog } from './gesture-log';
import { listenWheelGesture, OWN_GESTURES } from './wheel-gesture';

/** Minimum horizontal travel (px) for a swipe. */
export const SWIPE_MIN_DISTANCE = 56;
/** A swipe must be clearly more horizontal than vertical. */
export const SWIPE_MAX_SLOPE = 0.6;
/** Slower drags are treated as reading/scrolling, not swipes. */
export const SWIPE_MAX_DURATION = 700;

/**
 * Classify a finished touch. Returns 1 for a swipe to the left (reveal what
 * comes next), -1 for a swipe to the right (go back), or 0 for anything else.
 */
export function swipeDirection(dx: number, dy: number, ms: number): -1 | 0 | 1 {
  if (ms > SWIPE_MAX_DURATION) return 0;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return 0;
  if (Math.abs(dy) > Math.abs(dx) * SWIPE_MAX_SLOPE) return 0;
  return dx < 0 ? 1 : -1;
}


export interface SwipeOptions {
  onswipe: (dir: -1 | 1) => void;
  enabled?: boolean;
}

/** Travel (px) a touchpad swipe needs to turn the page without a flick. */
export const WHEEL_SWIPE_DISTANCE = 60;

/** Smoothed speed (px/ms), so one jittery sample doesn't decide a flick. */
export function smoothVelocity(previous: number, delta: number, dt: number): number {
  return dt > 0 ? previous * 0.6 + (delta / dt) * 0.4 : previous;
}

/**
 * Call `onswipe` when two fingers swipe sideways on a touchpad over `node`
 * and lift (see `wheel-gesture`). Vertical scrolling and pinch-zoom are left
 * alone, and content that scrolls sideways keeps its own horizontal scrolling.
 */
export function trackpadSwipe(node: HTMLElement, options: SwipeOptions) {
  let opts = options;
  let swipe: { offset: number; velocity: number; t: number } | null = null;

  const stop = listenWheelGesture(
    node,
    () => opts.enabled !== false,
    (action, t) => {
      if (action.type === 'move') {
        if (action.start || !swipe) swipe = { offset: 0, velocity: 0, t };
        swipe.velocity = smoothVelocity(swipe.velocity, action.delta, t - swipe.t);
        swipe.offset += action.delta;
        swipe.t = t;
      } else if (action.type === 'release' && swipe) {
        const dir = releaseDecision(swipe.offset, WHEEL_SWIPE_DISTANCE, swipe.velocity);
        swipe = null;
        if (dir !== 0) {
          gestureLog.record('swipe', { dir }, t);
          opts.onswipe(dir);
        }
      }
    },
  );
  return {
    update(next: SwipeOptions) {
      opts = next;
    },
    destroy: stop,
  };
}

/**
 * Call `onswipe` on a horizontal single-finger swipe over `node`, or a
 * two-finger swipe on a touchpad (see `trackpadSwipe`). Vertical scrolling is
 * left alone; give the node `touch-action: pan-y` so the browser doesn't claim
 * horizontal pans for itself.
 */
export function swipe(node: HTMLElement, options: SwipeOptions) {
  let opts = options;
  let start: { x: number; y: number; t: number } | null = null;
  const trackpad = trackpadSwipe(node, options);

  const onStart = (e: TouchEvent) => {
    const target = e.target as Element | null;
    if (opts.enabled === false || e.touches.length !== 1 || target?.closest(OWN_GESTURES)) {
      start = null;
      return;
    }
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, t: e.timeStamp };
  };
  const onEnd = (e: TouchEvent) => {
    if (!start) return;
    const t = e.changedTouches[0];
    const dir = swipeDirection(t.clientX - start.x, t.clientY - start.y, e.timeStamp - start.t);
    start = null;
    // Selecting text with a long press must not page away.
    if (dir !== 0 && !window.getSelection()?.toString()) opts.onswipe(dir);
  };
  const onCancel = () => (start = null);

  node.addEventListener('touchstart', onStart, { passive: true });
  node.addEventListener('touchend', onEnd, { passive: true });
  node.addEventListener('touchcancel', onCancel, { passive: true });
  return {
    update(next: SwipeOptions) {
      opts = next;
      trackpad.update(next);
    },
    destroy() {
      trackpad.destroy();
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onCancel);
    },
  };
}

/** Drag distance (px) past which releasing a sheet dismisses it. */
export const DISMISS_DISTANCE = 96;
/** A quick flick (px/ms) dismisses it regardless of distance. */
export const DISMISS_VELOCITY = 0.5;

export function shouldDismiss(dy: number, ms: number): boolean {
  if (dy <= 0) return false;
  return dy >= DISMISS_DISTANCE || dy / Math.max(ms, 1) >= DISMISS_VELOCITY;
}

export interface DragDismissOptions {
  /** The element that follows the finger (the sheet itself). */
  sheet: HTMLElement | null;
  ondismiss: () => void;
  enabled?: boolean;
}

/**
 * Let the user pull a bottom sheet down by `node` (its grab handle / header)
 * and let go to dismiss it; a short drag springs back. On dismiss the sheet is
 * left where the finger released it, so the exit transition continues from
 * there instead of jumping back first.
 */
export function dragToDismiss(node: HTMLElement, options: DragDismissOptions) {
  let opts = options;
  let drag: { id: number; y: number; t: number; dy: number } | null = null;

  const onDown = (e: PointerEvent) => {
    if (opts.enabled === false || !opts.sheet || e.button !== 0) return;
    // Buttons in the header (close, pickers) keep their own taps.
    if ((e.target as Element | null)?.closest('button, a, input, [role="listbox"]')) return;
    drag = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0 };
    node.setPointerCapture(e.pointerId);
    opts.sheet.style.transition = 'none';
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id || !opts.sheet) return;
    // Upward drags resist instead of lifting the sheet off its edge.
    const raw = e.clientY - drag.y;
    drag.dy = raw > 0 ? raw : raw / 4;
    opts.sheet.style.transform = `translateY(${drag.dy}px)`;
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dy, t } = drag;
    drag = null;
    const sheet = opts.sheet;
    if (!sheet) return;
    if (shouldDismiss(dy, e.timeStamp - t)) {
      sheet.style.transition = '';
      opts.ondismiss();
      return;
    }
    sheet.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
    sheet.style.transform = '';
  };

  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onUp);
  return {
    update(next: DragDismissOptions) {
      opts = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
    },
  };
}

// --- paging carousel ------------------------------------------------------
/** Dragging past this share of the width turns the page on release. */
export const PAGE_COMMIT_FRACTION = 0.3;
/** A flick this fast (px/ms) turns the page even after a short drag. */
export const PAGE_FLICK_VELOCITY = 0.35;
/** Movement (px) before a touch is read as a horizontal or vertical gesture. */
const AXIS_LOCK_DISTANCE = 8;

/**
 * Decide where a released drag settles: 1 for the next page (dragged left),
 * -1 for the previous one, 0 to spring back. It turns after `commit` px of
 * travel, or on a flick; `velocity` is in px/ms, signed like `dx`.
 */
export function releaseDecision(dx: number, commit: number, velocity: number): -1 | 0 | 1 {
  if (dx === 0) return 0;
  const far = Math.abs(dx) >= commit;
  const flick =
    Math.abs(dx) > 16 &&
    Math.abs(velocity) >= PAGE_FLICK_VELOCITY &&
    Math.sign(velocity) === Math.sign(dx);
  if (!far && !flick) return 0;
  return dx < 0 ? 1 : -1;
}

/** `releaseDecision` for a pager `width` px wide. */
export function pageDecision(dx: number, width: number, velocity: number): -1 | 0 | 1 {
  if (width <= 0) return 0;
  return releaseDecision(dx, width * PAGE_COMMIT_FRACTION, velocity);
}

/** How long the settle animation takes: quicker the faster the finger went. */
export function settleDuration(remaining: number, velocity: number): number {
  const ms = Math.abs(remaining) / Math.max(Math.abs(velocity), 0.9);
  return Math.round(Math.min(Math.max(ms, 140), 320));
}

const SETTLE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function placeTrack(track: HTMLElement, offset: string, ms = 0): void {
  track.style.transition = ms ? `transform ${ms}ms ${SETTLE_EASING}` : 'none';
  track.style.transform = `translateX(${offset})`;
}

function afterTransition(track: HTMLElement, ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      track.removeEventListener('transitionend', done);
      resolve();
    };
    // Fallback in case the event never fires (e.g. the element is hidden).
    const timer = setTimeout(done, ms + 60);
    track.addEventListener('transitionend', done);
  });
}

/**
 * Animate a three-page track (previous, current, next; resting at -100%) to
 * the page in `dir`, let `onpage` swap the contents so the new page becomes
 * the middle one, then snap back to rest without a visible jump.
 */
export async function turnPage(
  track: HTMLElement,
  dir: -1 | 1,
  onpage: (dir: -1 | 1) => void | Promise<void>,
  ms = 260,
): Promise<void> {
  placeTrack(track, dir === 1 ? '-200%' : '0%', ms);
  await afterTransition(track, ms);
  await onpage(dir);
  placeTrack(track, '-100%');
}

export interface DragPagerOptions {
  /** The sliding row holding the previous, current and next pages. */
  track: HTMLElement | null;
  /** Make the page in `dir` the current one (resolve once it's rendered). */
  onpage: (dir: -1 | 1) => void | Promise<void>;
  enabled?: boolean;
  reducedMotion?: boolean;
}

/**
 * A native-feeling pager: the track follows a finger on a touch screen, or two
 * on a touchpad, the neighbouring page sliding in as the current one slides
 * out, at most one page either way. When the fingers lift it settles on
 * whichever page the drag or flick points at; a touchpad's momentum after the
 * lift is ignored (see `wheel-gesture`). Vertical moves are left to
 * scrolling, and mouse drags to the arrow buttons.
 */
export function dragPager(node: HTMLElement, options: DragPagerOptions) {
  let opts = options;

  // --- the track, whatever moves it ---------------------------------------
  // `dx` is the track's offset from rest (negative shows the next page) and
  // `velocity` its smoothed speed in px/ms, signed like `dx`.
  let dx = 0;
  let velocity = 0;
  let lastT = 0;
  let settling = false;

  function begin(t: number): void {
    dx = 0;
    velocity = 0;
    lastT = t;
  }

  function move(delta: number, t: number): void {
    const track = opts.track;
    if (!track) return;
    const width = node.clientWidth;
    velocity = smoothVelocity(velocity, delta, t - lastT);
    lastT = t;
    // Only the neighbouring pages are rendered: never past them.
    dx = Math.max(-width, Math.min(width, dx + delta));
    placeTrack(track, `calc(-100% + ${dx}px)`);
    gestureLog.record('move', { offset: Math.round(dx), v: Math.round(velocity * 1000) / 1000, width }, t);
  }

  async function settle(cancel: boolean): Promise<void> {
    const track = opts.track;
    if (!track) return;
    settling = true;
    try {
      const width = node.clientWidth;
      const dir = cancel ? 0 : pageDecision(dx, width, velocity);
      gestureLog.record('settle', { dir, cancel, offset: Math.round(dx), v: Math.round(velocity * 1000) / 1000, width });
      if (dir === 0) {
        placeTrack(track, '-100%', opts.reducedMotion ? 0 : settleDuration(dx, velocity));
      } else {
        const ms = opts.reducedMotion ? 0 : settleDuration(width - Math.abs(dx), velocity);
        await turnPage(track, dir, opts.onpage, ms);
      }
    } finally {
      settling = false;
      dx = 0;
      velocity = 0;
      gestureLog.record('settled');
    }
  }

  // --- touch and pen --------------------------------------------------------
  let drag: { id: number; x: number; y: number; lastX: number; axis: 'x' | 'y' | null } | null = null;
  // A click arriving right after a drag is the finger lifting, not a tap.
  let swallowClicksUntil = 0;

  const onDown = (e: PointerEvent) => {
    if (opts.enabled === false || settling || wheelDragging || e.pointerType === 'mouse' || !opts.track) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, axis: null };
    gestureLog.record('pointerdown', { x: e.clientX, y: e.clientY, type: e.pointerType }, e.timeStamp);
    begin(e.timeStamp);
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    gestureLog.record('pointermove', { x: e.clientX, y: e.clientY }, e.timeStamp);
    if (drag.axis === null) {
      const ox = e.clientX - drag.x;
      const oy = e.clientY - drag.y;
      if (Math.abs(ox) > AXIS_LOCK_DISTANCE && Math.abs(ox) > Math.abs(oy)) {
        drag.axis = 'x';
        node.setPointerCapture(e.pointerId);
        drag.lastX = drag.x;
      } else if (Math.abs(oy) > AXIS_LOCK_DISTANCE) {
        drag = null; // a scroll, not a page turn
        return;
      } else {
        return;
      }
    }
    move(e.clientX - drag.lastX, e.timeStamp);
    drag.lastX = e.clientX;
  };

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { axis } = drag;
    drag = null;
    gestureLog.record(e.type, { x: e.clientX, y: e.clientY, axis }, e.timeStamp);
    if (axis !== 'x') return;
    // The finger moved the page; the lift must not also tap a day.
    swallowClicksUntil = performance.now() + 400;
    void settle(e.type === 'pointercancel');
  };

  const onClick = (e: MouseEvent) => {
    if (performance.now() > swallowClicksUntil) return;
    swallowClicksUntil = 0;
    e.preventDefault();
    e.stopPropagation();
  };

  // --- touchpad ---------------------------------------------------------------
  let wheelDragging = false;
  const stopWheel = listenWheelGesture(
    node,
    () => opts.enabled !== false && !drag && !!opts.track,
    (action, t) => {
      if (action.type === 'move') {
        // Fingers moving while the last swipe settles wait for it to finish.
        if (settling) return;
        if (!wheelDragging) {
          wheelDragging = true;
          begin(t);
        }
        move(action.delta, t);
      } else if (action.type === 'release' && wheelDragging) {
        wheelDragging = false;
        void settle(false);
      }
    },
  );

  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onUp);
  node.addEventListener('click', onClick, true);
  return {
    update(next: DragPagerOptions) {
      opts = next;
    },
    destroy() {
      stopWheel();
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      node.removeEventListener('click', onClick, true);
    },
  };
}
