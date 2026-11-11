/** Small reusable Svelte actions for the UI's tactile interactions. */
import { holdLayer } from './back-button.svelte';

/**
 * Move `node` to the end of <body>, out of any stacking context it was
 * declared in — for a sheet opened from inside the day pane that must cover
 * the top bar too.
 */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}

/**
 * Call `onOutside` when a pointer press lands outside `node` — used to dismiss
 * lightweight popovers (e.g. the month/year picker) without a full backdrop.
 * For toggleable popovers, attach to the wrapper containing both the trigger
 * and the popover so pressing the trigger does not dismiss before toggling.
 */
export function clickOutside(node: HTMLElement, onOutside: () => void) {
  let handler = onOutside;
  const onPointerDown = (e: PointerEvent) => {
    if (!node.contains(e.target as Node)) handler();
  };
  // Defer binding so the same click that mounted the popover doesn't close it.
  requestAnimationFrame(() =>
    document.addEventListener('pointerdown', onPointerDown, true),
  );
  return {
    update(next: () => void) {
      handler = next;
    },
    destroy() {
      document.removeEventListener('pointerdown', onPointerDown, true);
    },
  };
}

export interface TrapFocusOptions {
  onClose?: () => void;
  /**
   * Where focus goes on open: the first control (popovers) or the container
   * itself (dialogs, so their Close button isn't focused by default). Focus
   * that a child already claimed (e.g. an autofocused field) is left alone.
   */
  initial?: 'first' | 'container';
}

/**
 * Keep keyboard focus inside `node` while it's mounted — for popovers/dialogs
 * that should behave like proper dialogs: Tab cycles within, Escape closes (via
 * the supplied callback), and focus moves to the first control on open and
 * returns to the previously-focused element on close.
 */
export function trapFocus(
  node: HTMLElement,
  options?: (() => void) | TrapFocusOptions,
) {
  const parse = (o: typeof options): TrapFocusOptions =>
    typeof o === 'function' ? { onClose: o } : (o ?? {});
  let close = parse(options).onClose;
  const initial = parse(options).initial ?? 'first';
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const focusable = (): HTMLElement[] =>
    Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Stop the global Escape handler from also acting on this keypress.
      e.stopPropagation();
      close?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const focusIn = () => {
    if (node.contains(document.activeElement)) return;
    if (initial === 'container') node.focus({ preventScroll: true });
    else focusable()[0]?.focus();
  };

  node.addEventListener('keydown', onKeydown);
  // Back closes it too (as Escape), instead of leaving the app.
  const releaseLayer = holdLayer(node);
  // Move focus in right away: Escape only closes from inside, so deferring it
  // would drop a keypress that follows the opening one. Retry on the next frame
  // for content that only becomes focusable once laid out.
  focusIn();
  requestAnimationFrame(focusIn);

  return {
    update(next?: (() => void) | TrapFocusOptions) {
      close = parse(next).onClose;
    },
    destroy() {
      node.removeEventListener('keydown', onKeydown);
      releaseLayer();
      // Restore focus to whatever opened the popover, if it's still around and
      // focus hasn't gone elsewhere: this runs after the closing transition,
      // by when the user may have moved on (e.g. tapped the search field).
      const active = document.activeElement;
      if (!active || active === document.body || node.contains(active)) {
        previouslyFocused?.focus?.();
      }
    },
  };
}

/**
 * Toggle native spell-checking on an editable element — or on a container whose
 * editable descendants inherit it. The dictionary language is pinned to
 * English; the platform webview supplies the dictionaries locally.
 */
export function spellCheck(node: HTMLElement, enabled: boolean) {
  function apply(on: boolean) {
    node.spellcheck = on;
    node.lang = 'en';
  }
  apply(enabled);

  return {
    update: apply,
  };
}
