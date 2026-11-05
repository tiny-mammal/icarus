/**
 * Scroll-driven motion helpers for the site's pages (the landing page and the
 * mockups in `site/mockups/`).
 */

export const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Call `update` with how far `el` has travelled through the viewport: 0 when
 * its top touches the bottom edge, 1 when its bottom leaves the top edge.
 * Runs at most once per frame, and once right away.
 */
export function onScrollProgress(el: Element, update: (progress: number) => void): void {
  let queued = false;
  const measure = () => {
    queued = false;
    const rect = el.getBoundingClientRect();
    const total = rect.height + window.innerHeight;
    update(Math.min(1, Math.max(0, (window.innerHeight - rect.top) / total)));
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  measure();
}

/**
 * Mark the step that sits closest to the middle of the viewport with
 * `data-active`, and report its index. Used by scroll-driven tours.
 */
export function trackActiveStep(steps: Element[], onChange: (index: number) => void): void {
  let current = -1;
  const observer = new IntersectionObserver(
    (records) => {
      for (const record of records) {
        if (!record.isIntersecting) continue;
        const index = steps.indexOf(record.target);
        if (index === current) continue;
        steps[current]?.removeAttribute('data-active');
        record.target.setAttribute('data-active', '');
        current = index;
        onChange(index);
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  for (const step of steps) observer.observe(step);
}
