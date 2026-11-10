<script lang="ts">
  import { fade } from 'svelte/transition';
  import { tooltip } from '../lib/tooltip';
  import { app } from '../lib/store.svelte';

  /**
   * A small "back to top" button for a long scroller. It floats at the bottom
   * centre of the nearest positioned ancestor, appears once the reader is more
   * than a screen down (scrolled there, or sent there by a search hit), and
   * rises above the draft strip while one is docked.
   */
  let { target }: { target: HTMLElement | null } = $props();

  let shown = $state(false);

  $effect(() => {
    const el = target;
    if (!el) return;
    const update = () => (shown = el.scrollTop > el.clientHeight);
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  });

  function toTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
</script>

{#if shown}
  <button
    class="absolute left-1/2 z-float grid h-11 w-11 [transform:translateX(-50%)] place-items-center rounded-full border border-slate bg-surface text-text shadow-xl shadow-black/50 transition-colors hover:bg-slate-soft active:bg-slate
      {app.parkedDraft ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1.625rem+env(safe-area-inset-bottom))]'}"
    aria-label="Back to top"
    use:tooltip={'Back to top'}
    onclick={toTop}
    transition:fade={{ duration: 150 }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
  </button>
{/if}
