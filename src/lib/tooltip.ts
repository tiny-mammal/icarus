/**
 * Styled hover hints that replace the browser's native `title` tooltips.
 *
 * `use:tooltip={'Lock diary'}` or `use:tooltip={{ label: 'Save', keys: ['⌘/Ctrl', '↵'] }}`.
 * A single shared bubble lives at the end of <body>; it follows the mouse
 * pointer (after a short delay, instantly while moving between controls) and
 * keyboard focus, and never appears for touch, like native tooltips.
 */

export interface TooltipContent {
  label: string;
  /** Keyboard shortcut, one chip per key. */
  keys?: string[];
}

export type TooltipOptions = string | TooltipContent | null | undefined;

const SHOW_DELAY = 450;
/** Moving onto another control within this window shows its hint at once. */
const WARM_WINDOW = 400;
const GAP = 6;
const MARGIN = 8;

let bubble: HTMLDivElement | null = null;
let owner: HTMLElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | undefined;
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

/** Centre below the target, flip above when it would leave the viewport. */
function position(el: HTMLDivElement, target: HTMLElement) {
  const anchor = target.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = el;
  const maxLeft = window.innerWidth - width - MARGIN;
  const left = Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, MARGIN), maxLeft);
  const below = anchor.bottom + GAP;
  const above = below + height > window.innerHeight - MARGIN && anchor.top - GAP - height >= MARGIN;
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(above ? anchor.top - GAP - height : below)}px`;
  el.dataset.side = above ? 'top' : 'bottom';
}

function show(target: HTMLElement, content: TooltipContent) {
  clearTimeout(showTimer);
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

  const schedule = (delay: number) => {
    clearTimeout(showTimer);
    if (!content) return;
    const current = content;
    if (delay <= 0) show(node, current);
    else showTimer = setTimeout(() => show(node, current), delay);
  };

  const onEnter = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    schedule(owner || Date.now() - hiddenAt < WARM_WINDOW ? 0 : SHOW_DELAY);
  };
  const onLeave = () => hide(node);
  const onFocus = () => {
    if (node.matches(':focus-visible')) schedule(0);
  };

  node.addEventListener('pointerenter', onEnter);
  node.addEventListener('pointerleave', onLeave);
  node.addEventListener('focus', onFocus);
  node.addEventListener('blur', onLeave);

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
      hide(node);
    },
  };
}
