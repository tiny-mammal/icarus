/** Small reusable Svelte actions for the UI's tactile interactions. */

/**
 * Call `onOutside` when a pointer press lands outside `node` — used to dismiss
 * lightweight popovers (e.g. the month/year picker) without a full backdrop.
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

/**
 * Keep keyboard focus inside `node` while it's mounted — for popovers/dialogs
 * that should behave like proper dialogs: Tab cycles within, Escape closes (via
 * the supplied callback), and focus moves to the first control on open and
 * returns to the previously-focused element on close.
 */
export function trapFocus(node: HTMLElement, onClose?: () => void) {
  let close = onClose;
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

  node.addEventListener('keydown', onKeydown);
  // Focus the first control once the popover has mounted.
  requestAnimationFrame(() => focusable()[0]?.focus());

  return {
    update(next: () => void) {
      close = next;
    },
    destroy() {
      node.removeEventListener('keydown', onKeydown);
      // Restore focus to whatever opened the popover, if it's still around.
      previouslyFocused?.focus?.();
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
