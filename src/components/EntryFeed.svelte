<script lang="ts">
  import { untrack } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import type { TransitionConfig } from 'svelte/transition';
  import { app } from '../lib/store.svelte';
  import { dateKey, longDayLabel, monthLabel, weekdayShortLabel } from '../lib/date';
  import {
    FEED_ENTRY_REM,
    FEED_MONTH_REM,
    buildFeedRows,
    feedOffsets,
    monthRowFor,
    rowAt,
    rowForDay,
  } from '../lib/feed';
  import { previewText } from '../lib/text';
  import type { DiaryEntry } from '../lib/types';
  import { viewport } from '../lib/viewport.svelte';
  import ScrollTopButton from './ScrollTopButton.svelte';

  /**
   * Phones: the home screen. Every entry, newest first, in one virtualised
   * scroller with month headers; the header pinned on top names the month
   * being read and opens the calendar sheet to jump elsewhere.
   */

  const today = dateKey(new Date());
  const OVERSCAN = 6;

  let scroller = $state<HTMLElement | null>(null);
  let scrollTop = $state(0);
  let viewHeight = $state(0);
  let remPx = $state(16);
  let labelWidth = $state(0);
  /** Which way the feed last moved: 1 towards older entries, -1 back up. */
  let scrollDir = 1;

  const monthPx = $derived(FEED_MONTH_REM * remPx);
  const entryPx = $derived(FEED_ENTRY_REM * remPx);
  const rows = $derived(buildFeedRows(app.dayKeys, app.entriesByDay));
  const offsets = $derived(feedOffsets(rows, monthPx, entryPx));
  const total = $derived(offsets[rows.length]);

  const first = $derived(Math.max(0, rowAt(offsets, scrollTop) - OVERSCAN));
  const last = $derived(Math.min(rows.length, rowAt(offsets, scrollTop + viewHeight) + OVERSCAN + 1));
  // The rows themselves, not wrappers: a row that stays on screen while the
  // window moves is then left alone instead of rebuilding its preview.
  const visible = $derived(rows.slice(first, last));

  // The pinned header names the month of the first row below it. It stays
  // put: a month header arriving from below fades out before it would be
  // clipped, and the pinned label rolls over to it halfway through that fade.
  const pinnedRow = $derived(rows[monthRowFor(rows, rowAt(offsets, scrollTop + monthPx))]);
  const pinnedMonth = $derived(pinnedRow?.kind === 'month' ? pinnedRow.month : new Date());
  const pinnedLabel = $derived(monthLabel(pinnedMonth));

  /** Opacity of the month header at `top`: gone once it reaches the pinned one. */
  function headerOpacity(top: number): number {
    return Math.min(1, Math.max(0, ((top - scrollTop) / monthPx - 0.7) / 0.6));
  }

  /** Roll the pinned label the way the feed is moving, like an odometer. */
  function roll(_node: Element, { leaving = false } = {}): TransitionConfig {
    if (viewport.reducedMotion) return { duration: 120, css: (t) => `opacity: ${t}` };
    const from = (leaving ? -1 : 1) * scrollDir;
    return {
      duration: 240,
      easing: cubicOut,
      css: (t, u) => `opacity: ${t}; transform: translateY(${from * u * 1.2}em)`,
    };
  }

  function onScroll(): void {
    const next = scroller?.scrollTop ?? 0;
    if (next !== scrollTop) scrollDir = next > scrollTop ? 1 : -1;
    scrollTop = next;
  }

  $effect(() => {
    if (!scroller) return;
    const measure = () => {
      remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      viewHeight = scroller?.clientHeight ?? 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    return () => ro.disconnect();
  });

  // Keep the open day in view, so closing it lands where the reader left off
  // (also after stepping through days or jumping from the calendar).
  $effect(() => {
    const key = app.selectedKey;
    if (key) untrack(() => reveal(key));
  });

  function reveal(key: string): void {
    const index = rowForDay(rows, key);
    if (!scroller || index < 0) return;
    const top = offsets[index];
    if (top >= scrollTop + monthPx && top + entryPx <= scrollTop + viewHeight) return;
    scroller.scrollTop = top - monthPx;
  }

  function entryTitle(e: DiaryEntry): string {
    return e.title.trim() || 'Untitled';
  }
</script>

<section class="relative h-full" aria-label="Entries">
  <div
    bind:this={scroller}
    class="h-full overflow-y-auto overscroll-contain"
    onscroll={onScroll}
  >
    {#if rows.length === 0}
      <div class="flex h-full flex-col items-center justify-center gap-1 px-8 text-center">
        <p class="text-sm font-medium text-text">No entries yet</p>
        <p class="text-sm text-muted">Tap + to write today's, or pick a day from the calendar.</p>
      </div>
    {:else}
      <ol class="relative" style="height: {total}px">
        {#each visible as row, i (row.kind + row.key)}
          {@const index = first + i}
          <li
            class="absolute inset-x-0 top-0"
            style="height: {row.kind === 'month' ? monthPx : entryPx}px; transform: translateY({offsets[index]}px)"
          >
            {#if row.kind === 'month'}
              <h2
                class="flex h-full items-end px-4 pb-2 text-sm font-semibold tracking-tight text-text"
                style="opacity: {headerOpacity(offsets[index])}"
              >
                {monthLabel(row.month)}
              </h2>
            {:else}
              {@const day = row.entry.date}
              {@const preview = [row.entry.location, previewText(row.entry.content, 200)]
                .filter(Boolean)
                .join(' · ')}
              <div
                class="flex h-full gap-1 pl-3 pr-2
                  {row.firstOfDay && rows[index - 1]?.kind === 'entry' ? 'border-t border-slate' : ''}"
              >
                <div
                  class="w-10 shrink-0 pt-3 text-center leading-none {row.dayKey === today ? 'text-text' : 'text-muted'}"
                  aria-hidden="true"
                >
                  {#if row.firstOfDay}
                    <span class="block text-[0.6rem] font-medium uppercase tracking-wider">{weekdayShortLabel(day)}</span>
                    <span class="mt-1 block text-lg font-semibold tabular-nums">{day.getDate()}</span>
                  {/if}
                </div>
                <button
                  class="block h-full min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left transition-colors active:bg-slate"
                  aria-label="{longDayLabel(day, app.dateFormat)}: {entryTitle(row.entry)}"
                  onclick={() => app.jumpToEntry(row.entry)}
                >
                  <span class="block truncate text-sm font-medium leading-5 text-text">{entryTitle(row.entry)}</span>
                  {#if preview}
                    <span class="mt-0.5 line-clamp-2 text-xs leading-4 text-muted">{preview}</span>
                  {/if}
                </button>
              </div>
            {/if}
          </li>
        {/each}
      </ol>
      <!-- Room to scroll the last entry clear of the floating write button. -->
      <div class="h-[calc(6rem+env(safe-area-inset-bottom))]"></div>
    {/if}
  </div>

  <!-- Pinned month: covers the header row at the top and opens the calendar. -->
  <div
    class="pointer-events-none absolute inset-x-0 top-0 overflow-hidden bg-ink {scrollTop > 0 ? 'border-b border-slate' : ''}"
    style="height: {monthPx}px"
  >
    <!-- A chip, not a chevron: an arrow by a header reads as folding it away. -->
    <button
      class="group pointer-events-auto ml-2 flex h-full items-end px-2 pb-1 text-sm font-semibold tracking-tight text-text"
      aria-haspopup="dialog"
      aria-label="{pinnedLabel}, open calendar"
      onclick={() => app.openCalendar(pinnedMonth)}
    >
      <!-- The chip resizes to the new label while the old one rolls out. -->
      <span
        class="relative grid justify-items-start overflow-hidden whitespace-nowrap rounded-full bg-slate-soft px-3 py-1 transition-[width,background-color] duration-[240ms] ease-out group-hover:bg-slate group-active:bg-slate motion-reduce:transition-colors"
        style={labelWidth ? `width: calc(${labelWidth + 1}px + 1.5rem)` : ''}
        aria-hidden="true"
      >
        <span class="invisible absolute" bind:clientWidth={labelWidth}>{pinnedLabel}</span>
        {#key pinnedLabel}
          <span class="col-start-1 row-start-1" in:roll out:roll={{ leaving: true }}>{pinnedLabel}</span>
        {/key}
      </span>
    </button>
  </div>

  <ScrollTopButton target={scroller} />
</section>
