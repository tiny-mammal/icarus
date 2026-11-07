/**
 * Back (Android's system back, a browser's or PWA's back button) closes the
 * top-most open layer — a dialog, popover, search results, the editor or the
 * day pane — instead of leaving the app.
 *
 * While anything is open, one history entry sits above the app's own. Going
 * back pops it, and the top layer is dismissed exactly as an Escape keypress
 * would (Escape already closes the top-most layer everywhere). If more is
 * still open, a fresh entry replaces it. Closing everything from the UI pops
 * the entry, so with nothing open back keeps its default behaviour: Android
 * and installed PWAs leave the app. On Android this works without native code
 * because the WebView goes back through its history before closing the app.
 *
 * The URL never changes: the diary's state is not exposed to browser history.
 */
import { SvelteSet } from 'svelte/reactivity';

const KEY = 'icarusLayer';

/** Open focus-trapped layers, innermost last. */
const layers = new SvelteSet<HTMLElement>();

/** Our entry is the current history entry. */
let armed = $state(false);
/** We went back ourselves (everything closed), so the next pop is ours. */
let popping = false;

/**
 * Count `node` as an open layer until the returned function is called. Back
 * dispatches Escape inside it, so its own Escape handling closes it.
 */
export function holdLayer(node: HTMLElement): () => void {
  layers.add(node);
  return () => void layers.delete(node);
}

/** True while a registered popover, dialog or overlay is open. */
export function layerOpen(): boolean {
  return layers.size > 0;
}

/** Dismiss the top-most layer exactly as an Escape keypress would. */
export function dismissTopLayer(): void {
  const top = [...layers].at(-1);
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // Prefer the focused element (an open listbox inside a dialog answers first),
  // unless focus strayed outside the top layer.
  const target = (top && !top.contains(active) ? top : active) ?? document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

const ours = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && (state as Record<string, unknown>)[KEY] === true;

/**
 * Keep the history entry in step with `isOpen` (layers registered here plus
 * any app state the caller adds, e.g. the open day). Call once from a
 * component; returns the cleanup.
 */
export function syncBackButton(isOpen: () => boolean): () => void {
  // A reload keeps the history entry, though nothing is open any more.
  armed = ours(history.state);
  const onPop = () => {
    const ownPop = popping;
    popping = false;
    armed = ours(history.state);
    if (!ownPop && !armed) dismissTopLayer();
  };
  window.addEventListener('popstate', onPop);
  const stopSync = $effect.root(() => {
    $effect(() => {
      const open = isOpen();
      const onTop = armed; // read first: a pop must re-run this effect
      if (popping) return;
      if (open && !onTop) {
        history.pushState({ ...(history.state ?? {}), [KEY]: true }, '');
        armed = true;
      } else if (!open && onTop) {
        popping = true;
        history.back();
      }
    });
  });
  return () => {
    window.removeEventListener('popstate', onPop);
    stopSync();
  };
}
