<script lang="ts">
  import { tick } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { clickOutside, trapFocus } from '../lib/actions';
  import {
    addMonths,
    dateKey,
    keyToDate,
    isSameDay,
    monthGrid,
    monthLabel,
    monthShortLabels,
    weekdayLabels,
    longDayLabel,
    weekdayShortLabel,
  } from '../lib/date';
  import { dragPager, turnPage } from '../lib/gestures';
  import { truncateText } from '../lib/text';
  import { viewport } from '../lib/viewport.svelte';
  import type { DiaryEntry } from '../lib/types';

  const today = new Date();
  const grid = $derived(monthGrid(app.currentMonth, app.weekStart));
  const weekdays = $derived(weekdayLabels(app.weekStart));
  const monthsShort = monthShortLabels();

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

  function addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

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
  function isCurrentMonthCell(month: number): boolean {
    return (
      pickerYear === app.currentMonth.getFullYear() &&
      month === app.currentMonth.getMonth()
    );
  }
  function isThisMonthCell(month: number): boolean {
    return pickerYear === today.getFullYear() && month === today.getMonth();
  }

  // --- month paging -------------------------------------------------------
  // Phones: the previous, current and next months sit side by side on a track
  // that follows the finger (see `dragPager`), and the arrows slide it too.
  let trackEl = $state<HTMLElement | null>(null);
  let paging = false;
  const panelMonths = $derived([-1, 0, 1].map((offset) => addMonths(app.currentMonth, offset)));

  async function showMonth(dir: -1 | 1): Promise<void> {
    app.navigateMonth(dir);
    await tick();
  }

  async function page(dir: -1 | 1): Promise<void> {
    if (!viewport.compact || !trackEl || viewport.reducedMotion) {
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

  // Wider screens: the grid slides in from the side it came from, so paging
  // reads as movement through time. Plain variable on purpose: it only
  // remembers the last month to tell the direction.
  let lastMonth = app.currentMonth.getTime();
  const slideDir = $derived.by(() => {
    const t = app.currentMonth.getTime();
    const dir = Math.sign(t - lastMonth);
    lastMonth = t;
    return dir;
  });
  function slideIn(node: HTMLElement) {
    if (slideDir === 0 || viewport.reducedMotion) return { duration: 0 };
    return fly(node, { x: slideDir * 32, duration: 220, easing: cubicOut });
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

  // Phones can't fit titles in the cells, so the month's entries are listed
  // under the grid instead, grouped by day.
  const daysWithEntries = $derived(
    grid
      .filter(inCurrentMonth)
      .map((day) => ({ day, entries: entriesOn(day) }))
      .filter((d) => d.entries.length > 0),
  );

  // Titles shown inside a day cell before collapsing the rest into "+N more".
  const MAX_CELL_TITLES = 3;

  function entriesOn(d: Date): DiaryEntry[] {
    return app.entriesByDay.get(dateKey(d)) ?? [];
  }
  function entryTitle(e: DiaryEntry): string {
    return e.title.trim() || 'Untitled';
  }
  // When a day overflows, one title slot is traded for the "+N more" line so
  // the cell never grows past MAX_CELL_TITLES lines.
  function visibleTitles(entries: DiaryEntry[]): DiaryEntry[] {
    if (entries.length <= MAX_CELL_TITLES) return entries;
    return entries.slice(0, MAX_CELL_TITLES - 1);
  }
  function inCurrentMonth(d: Date): boolean {
    return d.getMonth() === app.currentMonth.getMonth();
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
            class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm tabular-nums transition-colors
              {isSameDay(day, today)
                ? 'bg-text font-semibold text-ink'
                : 'text-muted group-hover:text-text'}"
          >
            {day.getDate()}
          </span>

          <!-- Narrow screens: no room for titles, keep up to three dots -->
          {#if count > 0}
            <span class="flex items-center gap-1 sm:hidden">
              {#each Array(Math.min(count, 3)) as _, i (i)}
                <span class="h-1.5 w-1.5 rounded-full bg-muted"></span>
              {/each}
            </span>
          {/if}
        </div>

        <!-- Wider screens: entry titles, one line each, overflow as "+N more" -->
        {#if count > 0}
          <ul class="mt-1 hidden min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden sm:flex" aria-hidden="true">
            {#each shown as entry (entry.uid)}
              <li
                class="truncate rounded-md bg-slate px-1.5 py-0.5 text-[0.7rem] leading-tight text-text/80 transition-colors group-hover:text-text"
                title={entryTitle(entry)}
              >
                {entryTitle(entry)}
              </li>
            {/each}
            {#if count > shown.length}
              <li class="px-1.5 text-[0.65rem] font-medium leading-tight text-muted">
                +{count - shown.length} more
              </li>
            {/if}
          </ul>
        {/if}
      </button>
    {/each}
  </div>
{/snippet}

<!--
  Phones: a fixed, compact calendar that pages with the finger, and the
  month's entries scrolling below it. Wider screens: the grid fills the stage
  and shows titles in its cells.
-->
<section class="flex h-full flex-col px-3 pt-2 sm:px-10 sm:pb-6 sm:pt-3">
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
      <div class="relative">
      <button
        class="group flex items-center gap-1.5 rounded-lg px-2 py-1 text-lg font-semibold tracking-tight text-text transition-colors hover:bg-slate"
        onclick={togglePicker}
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
      >
        {monthLabel(app.currentMonth)}
        <svg
          class="text-muted transition-transform duration-200 group-hover:text-text {pickerOpen ? 'rotate-180' : ''}"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {#if pickerOpen}
        <div
          class="absolute left-0 top-full z-50 mt-2 w-72 origin-top-left rounded-2xl border border-slate bg-surface p-3 shadow-2xl shadow-black/50"
          transition:scale={{ duration: 160, start: 0.95, easing: cubicOut }}
          use:clickOutside={() => (pickerOpen = false)}
          use:trapFocus={() => (pickerOpen = false)}
          role="dialog"
          aria-label="Select month and year"
        >
          <!-- Year stepper -->
          <div class="mb-3 flex items-center justify-between">
            <button
              class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
              aria-label="Previous year"
              onclick={() => (pickerYear -= 1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span class="text-sm font-semibold tabular-nums tracking-tight text-text">{pickerYear}</span>
            <button
              class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
              aria-label="Next year"
              onclick={() => (pickerYear += 1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <!-- Month grid -->
          <div class="grid grid-cols-3 gap-1.5">
            {#each monthsShort as label, month (month)}
              <button
                class="rounded-lg py-2 text-sm font-medium tabular-nums transition-colors
                  {isCurrentMonthCell(month)
                    ? 'bg-text text-ink'
                    : isThisMonthCell(month)
                      ? 'text-text ring-1 ring-inset ring-faint hover:bg-slate'
                      : 'text-muted hover:bg-slate hover:text-text'}"
                onclick={() => pickMonth(month)}
              >
                {label}
              </button>
            {/each}
          </div>
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

  <!-- Day grid -->
  {#if viewport.compact}
    <!-- Edge to edge, so the neighbouring month slides in from the screen edge. -->
    <div
      class="-mx-3 shrink-0 touch-pan-y overflow-hidden"
      use:dragPager={{
        track: trackEl,
        onpage: showMonth,
        enabled: !app.selectedKey && !pickerOpen,
        reducedMotion: viewport.reducedMotion,
      }}
    >
      <div bind:this={trackEl} class="flex will-change-transform" style="transform: translateX(-100%)">
        {#each panelMonths as month, i (i)}
          <div class="w-full shrink-0 px-3" inert={i !== 1} aria-hidden={i === 1 ? undefined : 'true'}>
            {@render dayGrid(month, i === 1)}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    {#key app.currentMonth.getTime()}
      <div class="min-h-0 flex-1" in:slideIn>
        {@render dayGrid(app.currentMonth, true)}
      </div>
    {/key}
  {/if}

  <!-- Phones: this month's entries, tap one to read it. The only scroller. -->
  <div
    class="-mx-3 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate px-3 pt-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:hidden"
    role="region"
    aria-label="Entries this month"
  >
    {#if daysWithEntries.length === 0}
      <p class="py-6 text-center text-sm text-muted">No entries this month.</p>
    {:else}
      <ol class="space-y-1">
        {#each daysWithEntries as { day, entries } (dateKey(day))}
          <li class="flex gap-3">
            <div
              class="w-10 shrink-0 pt-2.5 text-center leading-none {isSameDay(day, today) ? 'text-text' : 'text-muted'}"
              aria-hidden="true"
            >
              <span class="block text-[0.6rem] font-medium uppercase tracking-wider">{weekdayShortLabel(day)}</span>
              <span class="mt-1 block text-lg font-semibold tabular-nums">{day.getDate()}</span>
            </div>
            <ul class="min-w-0 flex-1 space-y-1">
              {#each entries as entry (entry.uid)}
                <li>
                  <button
                    class="block w-full rounded-xl px-3 py-2.5 text-left transition-colors active:bg-slate hover:bg-slate-soft"
                    aria-label="{longDayLabel(day, app.dateFormat)}: {entryTitle(entry)}"
                    onclick={() => app.jumpToEntry(entry)}
                  >
                    <span class="block truncate text-sm font-medium text-text">{entryTitle(entry)}</span>
                    {#if entry.location || entry.content}
                      <span class="mt-0.5 block truncate text-xs text-muted">
                        {[entry.location, truncateText(entry.content, 140)].filter(Boolean).join(' · ')}
                      </span>
                    {/if}
                  </button>
                </li>
              {/each}
            </ul>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</section>
