/**
 * Reactive viewport facts shared by components that need them in script, not
 * just in CSS (e.g. to pick a slide-up transition for bottom sheets on phones).
 * `compact` mirrors Tailwind's `sm` breakpoint so script and markup agree.
 */
const COMPACT_QUERY = '(max-width: 639.98px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function mediaState(query: string): { readonly matches: boolean } {
  const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null;
  let matches = $state(mql?.matches ?? false);
  mql?.addEventListener('change', (e) => (matches = e.matches));
  return {
    get matches() {
      return matches;
    },
  };
}

const compact = mediaState(COMPACT_QUERY);
const reducedMotion = mediaState(REDUCED_MOTION_QUERY);

export const viewport = {
  /** Phone-sized layout (below Tailwind's `sm`). */
  get compact(): boolean {
    return compact.matches;
  },
  /** The user asked the system for less motion. */
  get reducedMotion(): boolean {
    return reducedMotion.matches;
  },
};
