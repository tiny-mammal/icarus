<script lang="ts">
  import { tick } from 'svelte';
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { clickOutside, trapFocus } from '../lib/actions';
  import {
    addDays,
    addMonths,
    dateKey,
    keyToDate,
    isSameDay,
    monthGrid,
    monthLabel,
    weekdayLabels,
    longDayLabel,
  } from '../lib/date';
  import { dragPager, turnPage } from '../lib/gestures';
  import MonthYearGrid from './MonthYearGrid.svelte';
  import { viewport } from '../lib/viewport.svelte';
  import type { DiaryEntry } from '../lib/types';

  const today = new Date();
  const weekdays = $derived(weekdayLabels(app.weekStart));

  // --- keyboard navigation (roving tabindex) ------------------------------
  // The grid is one tab stop: a single cell is tabbable at a time and the arrow
  // keys move focus between days, paging to the next/previous month at the edges.
  let gridEl = $state<HTMLElement | null>(null);
  let focusedKey = $state<string | null>(null);

  function inCurrentMonthKey(key: string): boolean {
    const d = keyToDate(key);
    return (
      d.getMonth() === app.currentMonth.getMonth() &&
      d.getFullYear() === app.currentMonth.getFullYear()
    );
  }

  // The single cell that carries tabindex=0. Prefers the day the user last
  // focused, then the selected day, then today, then the 1st of the month.
  const rovingKey = $derived.by(() => {
    if (focusedKey && inCurrentMonthKey(focusedKey)) return focusedKey;
    if (app.selectedKey && inCurrentMonthKey(app.selectedKey)) return app.selectedKey;
    const todayKey = dateKey(today);
    if (inCurrentMonthKey(todayKey)) return todayKey;
    return dateKey(app.currentMonth);
  });

  // Move focus to a day, switching the visible month first if it falls outside.
  async function focusDay(target: Date): Promise<void> {
    const key = dateKey(target);
    if (
      target.getMonth() !== app.currentMonth.getMonth() ||
      target.getFullYear() !== app.currentMonth.getFullYear()
    ) {
      app.goToMonth(target.getFullYear(), target.getMonth());
    }
    focusedKey = key;
    await tick();
    gridEl?.querySelector<HTMLElement>(`[data-daykey="${key}"]`)?.focus();
  }

  function onDayKeydown(e: KeyboardEvent): void {
    // While the day pane is open, the arrows belong to its day navigation.
    if (app.selectedKey) return;
    const base = keyToDate(focusedKey ?? rovingKey);
    // Offset of `base` within its week, honouring the configured week start.
    const dow = (base.getDay() - app.weekStart + 7) % 7;
    let target: Date | null = null;
    switch (e.key) {
      case 'ArrowLeft': target = addDays(base, -1); break;
      case 'ArrowRight': target = addDays(base, 1); break;
      case 'ArrowUp': target = addDays(base, -7); break;
      case 'ArrowDown': target = addDays(base, 7); break;
      case 'Home': target = addDays(base, -dow); break;
      case 'End': target = addDays(base, 6 - dow); break;
      case 'PageUp': target = new Date(base.getFullYear(), base.getMonth() - 1, base.getDate()); break;
      case 'PageDown': target = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate()); break;
      default: return;
    }
    e.preventDefault();
    void focusDay(target);
  }

  // --- month / year picker ------------------------------------------------
  let pickerOpen = $state(false);
  // The year being browsed inside the popover (independent of the live month
  // until the user actually picks one).
  let pickerYear = $state(app.currentMonth.getFullYear());

  function togglePicker() {
    if (!pickerOpen) pickerYear = app.currentMonth.getFullYear();
    pickerOpen = !pickerOpen;
  }
  function pickMonth(month: number) {
    app.goToMonth(pickerYear, month);
    pickerOpen = false;
  }

  // --- month paging -------------------------------------------------------
  // The previous, current and next months sit side by side on a track that
  // follows a finger on a touch screen or two on a touchpad (see `dragPager`);
  // the arrows slide it too.
  let trackEl = $state<HTMLElement | null>(null);
  let paging = false;
  const panelMonths = $derived([-1, 0, 1].map((offset) => addMonths(app.currentMonth, offset)));

  async function showMonth(dir: -1 | 1): Promise<void> {
    app.navigateMonth(dir);
    await tick();
  }

  async function page(dir: -1 | 1): Promise<void> {
    if (!trackEl || viewport.reducedMotion) {
      app.navigateMonth(dir);
      return;
    }
    if (paging) return;
    paging = true;
    try {
      await turnPage(trackEl, dir, showMonth);
    } finally {
      paging = false;
    }
  }

  // Keyboard focus lives in the current month's grid only.
  function currentGrid(node: HTMLElement, current: boolean) {
    if (current) gridEl = node;
    return {
      update(next: boolean) {
        if (next) gridEl = node;
      },
      destroy() {
        if (gridEl === node) gridEl = null;
      },
    };
  }

  // --- day cell titles -----------------------------------------------------
  // How many entry titles fit in a day cell depends on the cell height, which
  // varies with the window size. All cells share one height (grid-rows-6), so
  // a single measurement sizes every cell. Each chip and the "+N more" line
  // have a fixed height (see CHIP_* below) so whole lines are shown or hidden
  // instead of being clipped halfway.
  const CHIP_REM = 1.125; // h-[1.125rem] on each title chip
  const CHIP_GAP_REM = 0.125; // gap-0.5 between lines
  const MORE_REM = 0.875; // h-[0.875rem] on the "+N more" line
  const LIST_OFFSET_REM = 0.25; // mt-1 above the list

  // Available height (px) for the title list inside a day cell.
  let titleSpace = $state(0);
  let remPx = $state(16);

  function measureTitleSpace(): void {
    const cell = trackEl?.querySelector<HTMLElement>('[data-daykey]');
    // Measure the day number, not its column: the dots below it only show when
    // titles do not, so including them would make the measurement oscillate.
    const dayNumber = cell?.querySelector<HTMLElement>('[data-day-number]');
    if (!cell || !dayNumber) return;
    const style = getComputedStyle(cell);
    remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    titleSpace =
      cell.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) -
      dayNumber.offsetHeight -
      LIST_OFFSET_REM * remPx;
  }

  // Every month's cells share the track's size, so it is only re-measured when
  // the track resizes, never on a page turn. The observer reports after layout
  // (including once on start), so reading sizes there forces no extra layout.
  $effect(() => {
    if (!trackEl) return;
    const ro = new ResizeObserver(measureTitleSpace);
    ro.observe(trackEl);
    return () => ro.disconnect();
  });

  // How many title chips fit in `space` px after `reservedRem` is taken by
  // other lines (chips are separated by CHIP_GAP_REM).
  function linesThatFit(space: number, reservedRem: number): number {
    const line = (CHIP_REM + CHIP_GAP_REM) * remPx;
    return Math.max(0, Math.floor((space - reservedRem * remPx + CHIP_GAP_REM * remPx) / line));
  }
  // Titles shown with no overflow line, and titles shown next to "+N more".
  const fitAll = $derived(linesThatFit(titleSpace, 0));
  const fitWithMore = $derived(linesThatFit(titleSpace, MORE_REM + CHIP_GAP_REM));
  // Cells too short for even one title fall back to the dots used on phones.
  const showTitles = $derived(fitAll >= 1);

  function entriesOn(d: Date): DiaryEntry[] {
    return app.entriesByDay.get(dateKey(d)) ?? [];
  }
  function entryTitle(e: DiaryEntry): string {
    return e.title.trim() || 'Untitled';
  }
  // When a day overflows, title slots are traded for the "+N more" line so
  // the list never grows past the cell.
  function visibleTitles(entries: DiaryEntry[]): DiaryEntry[] {
    if (entries.length <= fitAll) return entries;
    return entries.slice(0, fitWithMore);
  }
  function inMonth(d: Date, month: Date): boolean {
    return d.getMonth() === month.getMonth();
  }
  function isSelected(d: Date): boolean {
    return app.selectedKey === dateKey(d);
  }
  // A screen-reader friendly label for a day cell: the full date, the entry
  // count and the titles, so the grid reads as
  // "Monday 8 June 2026, 2 entries: Morning run, Dinner with Ana".
  function dayLabel(d: Date): string {
    const base = longDayLabel(d, app.dateFormat);
    const entries = entriesOn(d);
    const n = entries.length;
    if (n === 0) return base;
    const titles = entries.map(entryTitle).join(', ');
    return `${base}, ${n} ${n === 1 ? 'entry' : 'entries'}: ${titles}`;
  }
</script>

{#snippet dayGrid(month: Date, current: boolean)}
  <div
    class="grid grid-cols-7 grid-rows-[repeat(6,3.25rem)] gap-px sm:h-full sm:grid-rows-6"
    use:currentGrid={current}
  >
    {#each monthGrid(month, app.weekStart) as day (dateKey(day))}
      {@const entries = entriesOn(day)}
      {@const count = entries.length}
      {@const shown = visibleTitles(entries)}
      {@const muted = !inMonth(day, month)}
      {@const key = dateKey(day)}
      <button
        class="group relative flex flex-col items-center rounded-xl border border-transparent p-1 text-left sm:items-stretch sm:p-2 transition-all duration-200 hover:border-slate hover:bg-slate-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-faint
          {isSelected(day) ? 'border-faint bg-slate-soft ring-1 ring-faint' : ''}
          {muted ? 'opacity-35' : ''}"
        data-daykey={key}
        tabindex={current && key === rovingKey ? 0 : -1}
        aria-label={dayLabel(day)}
        aria-pressed={isSelected(day)}
        aria-current={isSameDay(day, today) ? 'date' : undefined}
        onclick={() => { focusedKey = key; app.selectDay(key); }}
        onfocus={() => (focusedKey = key)}
        onkeydown={onDayKeydown}
      >
        <div class="flex w-7 flex-col items-center gap-1">
          <span
            data-day-number
            class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm tabular-nums transition-colors
              {isSameDay(day, today)
                ? 'bg-text font-semibold text-ink'
                : 'text-muted group-hover:text-text'}"
          >
            {day.getDate()}
          </span>

          <!-- Narrow or short cells: no room for titles, keep up to three dots -->
          {#if count > 0}
            <span class="flex items-center gap-1 {showTitles ? 'sm:hidden' : ''}">
              {#each Array(Math.min(count, 3)) as _, i (i)}
                <span class="h-1.5 w-1.5 rounded-full bg-muted"></span>
              {/each}
            </span>
          {/if}
        </div>

        <!-- Wider screens: entry titles, one line each, overflow as "+N more" -->
        {#if count > 0 && showTitles}
          <ul class="mt-1 hidden min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden sm:flex" aria-hidden="true">
            {#each shown as entry (entry.uid)}
              <li
                class="h-[1.125rem] shrink-0 truncate rounded-md bg-slate px-1.5 text-[0.7rem] leading-[1.125rem] text-text/80 transition-colors group-hover:text-text"
                title={entryTitle(entry)}
              >
                {entryTitle(entry)}
              </li>
            {/each}
            {#if count > shown.length}
              <li class="h-[0.875rem] shrink-0 px-1.5 text-[0.65rem] font-medium leading-[0.875rem] text-muted">
                {shown.length ? `+${count - shown.length} more` : `${count} entries`}
              </li>
            {/if}
          </ul>
        {/if}
      </button>
    {/each}
  </div>
{/snippet}

<!--
  Phones: a compact calendar that pages with the finger, shown in a sheet over
  the entry feed. Wider screens: the grid fills the stage and shows titles in
  its cells.
-->
<section class="flex flex-col px-3 sm:h-full sm:px-10 sm:pb-6 sm:pt-3">
  <!-- Month header -->
  <header class="relative mb-3 flex shrink-0 items-center justify-between sm:mb-5">
    <!-- Month navigation: arrows flanking the month/year picker -->
    <div class="flex items-center gap-1">
      <button
        class="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text sm:h-8 sm:w-8"
        aria-label="Previous month"
        onclick={() => page(-1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <!-- Month/year label — click to open the picker -->
      <div class="relative" use:clickOutside={() => (pickerOpen = false)}>
      <button
        class="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-lg font-semibold tracking-tight text-text transition-colors hover:bg-slate"
        onclick={togglePicker}
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
      >
        {monthLabel(app.currentMonth)}
        <svg
          class="text-muted transition-transform duration-200 group-hover:text-text {pickerOpen ? '[transform:rotate(180deg)]' : ''}"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {#if pickerOpen}
        <div
          class="absolute left-0 top-full z-popover mt-2 w-72 origin-top-left rounded-2xl border border-slate bg-surface p-3 shadow-2xl shadow-black/50"
          transition:scale={{ duration: 160, start: 0.95, easing: cubicOut }}
          use:trapFocus={() => (pickerOpen = false)}
          role="dialog"
          aria-label="Select month and year"
        >
          <MonthYearGrid
            bind:year={pickerYear}
            selected={{ year: app.currentMonth.getFullYear(), month: app.currentMonth.getMonth() }}
            onpick={pickMonth}
          />
        </div>
      {/if}
      </div>

      <button
        class="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text sm:h-8 sm:w-8"
        aria-label="Next month"
        onclick={() => page(1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>

    <button
      class="rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text sm:py-1.5"
      onclick={() => app.goToToday()}
    >
      Today
    </button>
  </header>

  <!-- Weekday labels -->
  <div class="mb-1 grid shrink-0 grid-cols-7 gap-px sm:mb-2">
    {#each weekdays as label}
      <div class="pb-1 text-center text-[0.7rem] font-medium uppercase tracking-wider text-muted">
        {label}
      </div>
    {/each}
  </div>

  <!-- Day grid. Edge to edge, so the neighbouring month slides in from the edge. -->
  <!-- On phones the open day covers the calendar, so it doesn't page underneath. -->
  <div
    class="-mx-3 shrink-0 [touch-action:pan-y] overflow-hidden sm:-mx-10 sm:min-h-0 sm:flex-1"
    use:dragPager={{
      track: trackEl,
      onpage: showMonth,
      enabled: !pickerOpen && !(viewport.compact && app.selectedKey),
      reducedMotion: viewport.reducedMotion,
    }}
  >
    <div bind:this={trackEl} class="flex will-change-transform sm:h-full" style="transform: translateX(-100%)">
      <!-- Keyed by month, so a page turn keeps the two months already drawn
           and only builds the one sliding in. -->
      {#each panelMonths as month, i (month.getTime())}
        <!-- The neighbours are off screen and their days untabbable, so
             aria-hidden is enough. Not `inert`: moving it between panels on
             every page turn restyles all of their days. -->
        <div class="w-full shrink-0 px-3 sm:h-full sm:px-10" aria-hidden={i === 1 ? undefined : 'true'}>
          {@render dayGrid(month, i === 1)}
        </div>
      {/each}
    </div>
  </div>

</section>
