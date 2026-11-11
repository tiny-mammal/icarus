<script lang="ts">
  import { tooltip } from '../lib/tooltip';
  import { tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { app } from '../lib/store.svelte';
  import {
    addMonths,
    calendarKeyTarget,
    dateKey,
    longDayLabel,
    monthGrid,
    monthLabel,
    startOfMonth,
    weekdayLabels,
  } from '../lib/date';
  import MonthYearGrid from './MonthYearGrid.svelte';

  /**
   * A compact month for picking days, shared by the entry date picker (one
   * day: `start` and `end` are the same) and the statistics range picker. The
   * chosen days are joined by a band; `tentative` draws it lighter while the
   * range is still a hover preview. Days with entries carry a dot, so the
   * picker doubles as a map of where the writing is. The month label opens a
   * month/year grid for long jumps. Arrow keys move between days, Page Up/Down
   * between months.
   */
  let {
    month = $bindable(),
    start,
    end,
    tentative = false,
    onpick,
    onhover,
  }: {
    /** First day of the month on show. */
    month: Date;
    start: Date | null;
    end: Date | null;
    tentative?: boolean;
    onpick: (day: Date) => void;
    /** The day under the pointer or keyboard focus, or null on leaving. */
    onhover?: (day: Date | null) => void;
  } = $props();

  const today = new Date();
  const todayKey = dateKey(today);
  const weekdays = $derived(weekdayLabels(app.weekStart));
  const grid = $derived(monthGrid(month, app.weekStart));

  const startKey = $derived(start ? dateKey(start) : null);
  const endKey = $derived(end ? dateKey(end) : null);

  // --- month / year view --------------------------------------------------
  let choosingMonth = $state(false);
  let pickerYear = $state(month.getFullYear());

  function toggleMonthView() {
    if (!choosingMonth) pickerYear = month.getFullYear();
    choosingMonth = !choosingMonth;
  }

  function pickMonth(m: number) {
    month = new Date(pickerYear, m, 1);
    choosingMonth = false;
  }

  // --- keyboard navigation (roving tabindex) ------------------------------
  let gridEl = $state<HTMLElement | null>(null);
  let focusedKey = $state<string | null>(null);

  const inMonth = (d: Date) =>
    d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();

  // The one tabbable day: the last focused, else the range start, else today,
  // else the 1st — whichever is on show.
  const rovingKey = $derived.by(() => {
    for (const key of [focusedKey, startKey, endKey, todayKey]) {
      if (key && grid.some((d) => inMonth(d) && dateKey(d) === key)) return key;
    }
    return dateKey(month);
  });

  async function focusDay(target: Date) {
    if (!inMonth(target)) month = startOfMonth(target);
    focusedKey = dateKey(target);
    await tick();
    gridEl?.querySelector<HTMLElement>(`[data-key="${focusedKey}"]`)?.focus();
  }

  function onKeydown(e: KeyboardEvent, day: Date) {
    const target = calendarKeyTarget(day, e.key, app.weekStart);
    if (!target) return;
    e.preventDefault();
    void focusDay(target);
  }

  // --- range drawing ------------------------------------------------------
  function role(key: string): 'start' | 'end' | 'single' | 'inside' | null {
    if (!startKey || !endKey) return key === startKey ? 'single' : null;
    if (startKey === endKey) return key === startKey ? 'single' : null;
    if (key === startKey) return 'start';
    if (key === endKey) return 'end';
    return key > startKey && key < endKey ? 'inside' : null;
  }

  function dayLabel(day: Date, r: ReturnType<typeof role>, written: boolean): string {
    const parts = [longDayLabel(day, app.dateFormat)];
    if (written) parts.push('has entries');
    if (r === 'start') parts.push('range start');
    else if (r === 'end') parts.push('range end');
    else if (r === 'single') parts.push('selected');
    return parts.join(', ');
  }
</script>

<div class="select-none">
  <div class="mb-2 flex items-center justify-between">
    <button
      type="button"
      class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text disabled:invisible"
      aria-label="Previous month"
      use:tooltip={'Previous month'}
      disabled={choosingMonth}
      onclick={() => (month = addMonths(month, -1))}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <button
      type="button"
      class="group flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold tracking-tight text-text transition-colors hover:bg-slate"
      aria-expanded={choosingMonth}
      onclick={toggleMonthView}
    >
      <span aria-live="polite">{monthLabel(month)}</span>
      <svg
        class="text-muted transition-transform duration-200 group-hover:text-text {choosingMonth ? '[transform:rotate(180deg)]' : ''}"
        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <button
      type="button"
      class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text disabled:invisible"
      aria-label="Next month"
      use:tooltip={'Next month'}
      disabled={choosingMonth}
      onclick={() => (month = addMonths(month, 1))}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </div>

  {#if choosingMonth}
    <!-- Same footprint as the day grid, so the popover does not jump. -->
    <div class="flex h-[16.1rem] flex-col justify-center" in:fade={{ duration: 120 }}>
      <MonthYearGrid
        bind:year={pickerYear}
        selected={{ year: month.getFullYear(), month: month.getMonth() }}
        onpick={pickMonth}
      />
    </div>
  {:else}
    <div class="grid grid-cols-7" aria-hidden="true">
      {#each weekdays as label}
        <div class="pb-1.5 text-center text-[0.65rem] font-medium text-muted">{label}</div>
      {/each}
    </div>

    <div
      bind:this={gridEl}
      class="grid grid-cols-7 gap-y-1"
      role="group"
      aria-label={monthLabel(month)}
      onpointerleave={() => onhover?.(null)}
    >
      {#each grid as day, i (day.getTime())}
        {@const key = dateKey(day)}
        {@const r = role(key)}
        {@const col = i % 7}
        {@const written = app.entriesByDay.has(key)}
        {@const endpoint = r === 'start' || r === 'end' || r === 'single'}
        <div class="relative h-9">
          {#if r === 'start' || r === 'end' || r === 'inside'}
            <!-- The band runs edge to edge between the two ends, rounding
                 off where a week wraps. -->
            <div
              class="absolute inset-y-0 transition-colors
                {tentative ? 'bg-slate/45' : 'bg-slate/80'}
                {r === 'start' ? 'left-1/2' : 'left-0'}
                {r === 'end' ? 'right-1/2' : 'right-0'}
                {col === 0 && r !== 'start' ? 'rounded-l-lg' : ''}
                {col === 6 && r !== 'end' ? 'rounded-r-lg' : ''}"
              aria-hidden="true"
            ></div>
          {/if}
          <button
            type="button"
            data-key={key}
            tabindex={key === rovingKey ? 0 : -1}
            class="relative mx-auto grid h-9 w-9 place-items-center rounded-lg text-xs tabular-nums transition-colors
              {endpoint
                ? 'bg-text font-semibold text-ink'
                : r === 'inside'
                  ? 'text-text hover:bg-faint'
                  : key === todayKey
                    ? 'text-text ring-1 ring-inset ring-faint hover:bg-slate'
                    : 'text-muted hover:bg-slate hover:text-text'}
              {inMonth(day) ? '' : 'opacity-35'}"
            aria-label={dayLabel(day, r, written)}
            aria-current={key === todayKey ? 'date' : undefined}
            onclick={() => onpick(day)}
            onpointerenter={() => onhover?.(day)}
            onfocus={() => {
              focusedKey = key;
              onhover?.(day);
            }}
            onkeydown={(e) => onKeydown(e, day)}
          >
            {day.getDate()}
            {#if written}
              <span
                class="absolute bottom-1 left-1/2 h-[3px] w-[3px] rounded-full [transform:translateX(-50%)] {endpoint ? 'bg-ink/60' : 'bg-muted'}"
                aria-hidden="true"
              ></span>
            {/if}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
