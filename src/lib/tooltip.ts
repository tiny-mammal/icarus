/**
 * Styled hover hints that replace the browser's native `title` tooltips.
 *
 * `use:tooltip={'Lock diary'}` or `use:tooltip={{ label: 'Save', keys: ['⌘/Ctrl', '↵'] }}`.
 * A single shared bubble lives at the end of <body>; it follows the mouse
 * pointer (after a short delay, instantly while moving between controls) and
 * keyboard focus. On touch it appears on a long press, like Android's own
 * tooltips: above the finger, and the press then does not activate the control.
 */

export interface TooltipContent {
  label: string;
  /** Keyboard shortcut, one chip per key. */
  keys?: string[];
  /** Only show while the element's own text is cut off (e.g. an ellipsis). */
  truncatedOnly?: boolean;
}

export type TooltipOptions = string | TooltipContent | null | undefined;

const SHOW_DELAY = 450;
/** Moving onto another control within this window shows its hint at once. */
const WARM_WINDOW = 400;
const GAP = 6;
const MARGIN = 8;
/** Holding a touch this long shows the hint instead of tapping. */
export const LONG_PRESS = 500;
/** A finger drifting further than this is scrolling or swiping, not holding. */
const PRESS_SLOP = 10;
/** How long a long-press hint stays up after the finger lifts. */
const TOUCH_LINGER = 1500;
/** Upper bound for the click that follows lifting a long press. */
const CLICK_WINDOW = 400;

let bubble: HTMLDivElement | null = null;
let owner: HTMLElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let lingerTimer: ReturnType<typeof setTimeout> | undefined;
/** Touch hints go above the target, where the finger does not cover them. */
let preferAbove = false;
let hiddenAt = 0;

function normalize(options: TooltipOptions): TooltipContent | null {
  if (!options) return null;
  const content = typeof options === 'string' ? { label: options } : options;
  return content.label ? content : null;
}

function ensureBubble(): HTMLDivElement {
  if (bubble?.isConnected) return bubble;
  bubble = document.createElement('div');
  bubble.className = 'tooltip';
  bubble.id = 'app-tooltip';
  bubble.setAttribute('role', 'tooltip');
  document.body.append(bubble);
  return bubble;
}

function render(el: HTMLDivElement, content: TooltipContent) {
  const label = document.createElement('span');
  label.textContent = content.label;
  const parts: Node[] = [label];
  if (content.keys?.length) {
    const keys = document.createElement('span');
    keys.className = 'tooltip-keys';
    for (const key of content.keys) {
      const kbd = document.createElement('kbd');
      kbd.textContent = key;
      keys.append(kbd);
    }
    parts.push(keys);
  }
  el.replaceChildren(...parts);
}

/**
 * Centre on the target, below it (above for touch); switch sides when the
 * preferred one would leave the viewport.
 */
function position(el: HTMLDivElement, target: HTMLElement) {
  const anchor = target.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = el;
  const maxLeft = window.innerWidth - width - MARGIN;
  const left = Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, MARGIN), maxLeft);
  const below = anchor.bottom + GAP;
  const aboveTop = anchor.top - GAP - height;
  const fitsBelow = below + height <= window.innerHeight - MARGIN;
  const fitsAbove = aboveTop >= MARGIN;
  const above = preferAbove ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(above ? aboveTop : below)}px`;
  el.dataset.side = above ? 'top' : 'bottom';
}

function show(target: HTMLElement, content: TooltipContent) {
  clearTimeout(showTimer);
  clearTimeout(lingerTimer);
  const el = ensureBubble();
  owner = target;
  render(el, content);
  position(el, target);
  // Only describe the control when the hint adds to its accessible name.
  if (content.label !== target.getAttribute('aria-label')) {
    target.setAttribute('aria-describedby', el.id);
  }
  el.dataset.open = '';
}

function hide(target?: HTMLElement) {
  if (target && owner !== target) {
    if (!owner) clearTimeout(showTimer);
    return;
  }
  clearTimeout(showTimer);
  clearTimeout(lingerTimer);
  if (owner) {
    if (owner.getAttribute('aria-describedby') === bubble?.id) {
      owner.removeAttribute('aria-describedby');
    }
    hiddenAt = Date.now();
  }
  owner = null;
  if (bubble) delete bubble.dataset.open;
}

// Any scroll, press or Escape dismisses the current hint.
let globalsBound = false;
function bindGlobals() {
  if (globalsBound) return;
  globalsBound = true;
  const dismiss = () => hide();
  window.addEventListener('scroll', dismiss, { capture: true, passive: true });
  window.addEventListener('resize', dismiss, { passive: true });
  window.addEventListener('pointerdown', dismiss, { capture: true });
  window.addEventListener('keydown', (e) => e.key === 'Escape' && hide(), { capture: true });
}

export function tooltip(node: HTMLElement, options: TooltipOptions) {
  let content = normalize(options);
  bindGlobals();

  // No iOS link/image callout competing with the long press.
  node.style.setProperty('-webkit-touch-callout', 'none');

  const schedule = (delay: number, touch = false, onShown?: () => void) => {
    clearTimeout(showTimer);
    if (!content) return;
    if (content.truncatedOnly && node.scrollWidth <= node.clientWidth) return;
    const current = content;
    const run = () => {
      preferAbove = touch;
      show(node, current);
      onShown?.();
    };
    if (delay <= 0) run();
    else showTimer = setTimeout(run, delay);
  };

  const onEnter = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    schedule(owner || Date.now() - hiddenAt < WARM_WINDOW ? 0 : SHOW_DELAY);
  };
  const onLeave = (e: Event) => {
    // A lifted finger also "leaves"; the long-press hint lingers instead.
    const { pointerType } = e as Partial<PointerEvent>;
    if (pointerType && pointerType !== 'mouse') return;
    hide(node);
  };
  const onFocus = () => {
    if (node.matches(':focus-visible')) schedule(0);
  };

  // Long press (touch and pen).
  let press: { id: number; x: number; y: number } | null = null;
  let held = false;
  const endPress = () => {
    press = null;
    if (owner !== node) clearTimeout(showTimer);
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    held = false;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY };
    schedule(LONG_PRESS, true, () => (held = true));
  };
  const onMove = (e: PointerEvent) => {
    if (press?.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > PRESS_SLOP) endPress();
  };
  const linger = () => {
    if (owner === node) lingerTimer = setTimeout(() => hide(node), TOUCH_LINGER);
  };
  const onUp = (e: PointerEvent) => {
    if (press?.id !== e.pointerId) return;
    endPress();
    if (!held) return;
    linger();
    // The click that follows a lift comes right after; if it never does (the
    // finger slid off), don't swallow a later activation.
    setTimeout(() => (held = false), CLICK_WINDOW);
  };
  const onCancel = (e: PointerEvent) => {
    if (press?.id !== e.pointerId) return;
    endPress();
    if (held) linger();
    held = false;
  };
  // The press was for the hint: don't also activate the control (Svelte
  // delegates clicks to the root, so stopping here keeps its handlers out),
  // nor open the platform's context menu.
  const onClick = (e: MouseEvent) => {
    if (!held) return;
    held = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const onContextMenu = (e: Event) => {
    if (press || held) e.preventDefault();
  };

  node.addEventListener('pointerenter', onEnter);
  node.addEventListener('pointerleave', onLeave);
  node.addEventListener('focus', onFocus);
  node.addEventListener('blur', onLeave);
  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onCancel);
  node.addEventListener('click', onClick, true);
  node.addEventListener('contextmenu', onContextMenu);

  return {
    update(next: TooltipOptions) {
      content = normalize(next);
      if (owner !== node) return;
      if (content) show(node, content);
      else hide(node);
    },
    destroy() {
      node.removeEventListener('pointerenter', onEnter);
      node.removeEventListener('pointerleave', onLeave);
      node.removeEventListener('focus', onFocus);
      node.removeEventListener('blur', onLeave);
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onCancel);
      node.removeEventListener('click', onClick, true);
      node.removeEventListener('contextmenu', onContextMenu);
      hide(node);
    },
  };
}
