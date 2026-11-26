<script lang="ts">
  import { tick } from 'svelte';
  import { app } from '../lib/store.svelte';
  import Modal from './Modal.svelte';
  import Segmented from './Segmented.svelte';
  import StatsPeriodSelect from './StatsPeriodSelect.svelte';
  import TrackingStats from './TrackingStats.svelte';
  import WritingStats from './WritingStats.svelte';
  import { dragPager, pageTurner, watchPager } from '../lib/gestures';
  import { viewport } from '../lib/viewport.svelte';
  import type { StatsPeriod } from '../lib/stats';
  import { hasTracking } from '../lib/tracker-stats';
  import { t } from '../lib/i18n/index.svelte';

  type View = 'writing' | 'tracking';
  const views = $derived<{ value: View; label: string }[]>([
    { value: 'writing', label: t.stats.views.writing },
    { value: 'tracking', label: t.stats.views.tracking },
  ]);

  let period = $state<StatsPeriod>('all');
  let chosen = $state<View>('writing');
  // A diary that never tracked anything has no tracking view to switch to.
  const tracked = $derived(hasTracking(app.tracker));
  const view = $derived(tracked ? chosen : 'writing');

  // The views are pages of a book: the previous, current and next sit side by
  // side on a track that follows a finger on a touch screen or two on a
  // touchpad, the same as the calendar's months (see `dragPager`); the switch
  // above slides it too.
  let trackEl = $state<HTMLElement | null>(null);
  const index = $derived(views.findIndex((v) => v.value === view));
  const beside = (dir: -1 | 1): View | null => (tracked ? (views[index + dir]?.value ?? null) : null);
  const pages = $derived<(View | null)[]>([beside(-1), view, beside(1)]);
  // The pager is only as tall as the page in view, so a short page doesn't
  // leave room for a long neighbour.
  let pageHeight = $state(0);

  // The switch's highlight moves with the track, whatever moves it.
  let pagerEl = $state<HTMLElement | null>(null);
  let pagesOff = $state(0);
  $effect(() => {
    if (!pagerEl || !trackEl) return;
    const stop = watchPager(pagerEl, trackEl, (pages) => (pagesOff = pages));
    return () => {
      stop();
      pagesOff = 0;
    };
  });

  function measureWhenCurrent(node: HTMLElement, current: boolean) {
    const ro = new ResizeObserver(() => {
      if (current) pageHeight = node.offsetHeight;
    });
    ro.observe(node);
    return {
      update(next: boolean) {
        current = next;
        if (current) pageHeight = node.offsetHeight;
      },
      destroy: () => ro.disconnect(),
    };
  }

  async function showView(dir: -1 | 1): Promise<void> {
    const next = beside(dir);
    if (next) chosen = next;
    await tick();
  }

  const turn = pageTurner(showView);
  const go = (dir: -1 | 1) => turn(trackEl, dir, !viewport.reducedMotion && beside(dir) !== null);
  const choose = (next: View) => {
    const dir = views.findIndex((v) => v.value === next) > index ? 1 : -1;
    return go(dir);
  };
</script>

{#if app.statsOpen}
  <Modal
    title={t.stats.title}
    onclose={() => (app.statsOpen = false)}
    width="sm:max-w-2xl"
    z="z-sheet"
    divided
    bodyClass=""
  >
    {#snippet actions()}
      <StatsPeriodSelect bind:period />
    {/snippet}

    {#if tracked}
      <div class="mb-4 px-6">
        <Segmented value={view} options={views} onchange={choose} label={t.stats.viewLabel} position={index + pagesOff} />
      </div>
    {/if}

    <!-- Edge to edge, so the neighbouring view slides in from the edge. -->
    <div
      bind:this={pagerEl}
      class="[touch-action:pan-y] overflow-hidden"
      style:height={pageHeight ? `${pageHeight}px` : undefined}
      use:dragPager={{
        track: trackEl,
        onpage: showView,
        canPage: (dir) => beside(dir) !== null,
        reducedMotion: viewport.reducedMotion,
      }}
    >
      <div bind:this={trackEl} class="flex items-start will-change-transform" style="transform: translateX(-100%)">
        <!-- Keyed by view, so a page turn keeps the two pages already drawn
             and only builds the one sliding in. -->
        {#each pages as page, i (page ?? `edge:${i}`)}
          <div
            class="w-full shrink-0 px-6"
            aria-hidden={i === 1 ? undefined : 'true'}
            inert={i !== 1}
            use:measureWhenCurrent={i === 1}
          >
            {#if page === 'tracking'}
              <TrackingStats {period} />
            {:else if page === 'writing'}
              <WritingStats {period} />
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </Modal>
{/if}
