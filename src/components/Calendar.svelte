<script lang="ts">
  import { tick } from 'svelte';
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { clickOutside, trapFocus } from '../lib/actions';
  import {
    dateKey,
    keyToDate,
    isSameDay,
    monthGrid,
    monthLabel,
    monthShortLabels,
    weekdayLabels,
    longDayLabel,
  } from '../lib/date';
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
  function isSelected(d: Date): boolean {
    return app.selectedKey === dateKey(d);
  }
  // A screen-reader friendly label for a day cell: the full date, the entry
  // count and the titles, so the grid reads as
  // "Monday 8 June 2026, 2 entries: Morning run, Dinner with Ana".
  function dayLabel(d: Date): string {
    const base = longDayLabel(d);
    const entries = entriesOn(d);
    const n = entries.length;
    if (n === 0) return base;
    const titles = entries.map(entryTitle).join(', ');
    return `${base}, ${n} ${n === 1 ? 'entry' : 'entries'}: ${titles}`;
  }
</script>

<section class="flex h-full flex-col px-6 pb-6 pt-3 sm:px-10">
  <!-- Month header -->
  <header class="relative mb-5 flex items-center justify-between">
    <!-- Month navigation: arrows flanking the month/year picker -->
    <div class="flex items-center gap-1">
      <button
        class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
        aria-label="Previous month"
        onclick={() => app.navigateMonth(-1)}
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
        class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
        aria-label="Next month"
        onclick={() => app.navigateMonth(1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>

    <button
      class="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text"
      onclick={() => app.goToToday()}
    >
      Today
    </button>
  </header>

  <!-- Weekday labels -->
  <div class="mb-2 grid grid-cols-7 gap-px">
    {#each weekdays as label}
      <div class="pb-1 text-center text-[0.7rem] font-medium uppercase tracking-wider text-muted">
        {label}
      </div>
    {/each}
  </div>

  <!-- Day grid -->
  <div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px" bind:this={gridEl}>
    {#each grid as day (dateKey(day))}
      {@const entries = entriesOn(day)}
      {@const count = entries.length}
      {@const shown = visibleTitles(entries)}
      {@const muted = !inCurrentMonth(day)}
      {@const key = dateKey(day)}
      <button
        class="group relative flex flex-col rounded-xl border border-transparent p-2 text-left transition-all duration-200 hover:border-slate hover:bg-slate-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-faint
          {isSelected(day) ? 'border-faint bg-slate-soft ring-1 ring-faint' : ''}
          {muted ? 'opacity-35' : ''}"
        data-daykey={key}
        tabindex={key === rovingKey ? 0 : -1}
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
</section>
