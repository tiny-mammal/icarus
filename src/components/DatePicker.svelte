<script lang="ts">
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { clickOutside, trapFocus } from '../lib/actions';
  import { app } from '../lib/store.svelte';
  import {
    dateKey,
    keyToDate,
    isSameDay,
    monthGrid,
    monthLabel,
    addMonths,
    startOfMonth,
    weekdayLabels,
    shortDayLabel,
  } from '../lib/date';

  // Bound to a local `YYYY-MM-DD` key (e.g. app.draftDateKey).
  let { value = $bindable() }: { value: string } = $props();

  const today = new Date();
  const weekdays = $derived(weekdayLabels(app.weekStart));

  let open = $state(false);
  // Resolve the bound key to a Date, falling back to today if it's missing.
  const selected = $derived(value ? keyToDate(value) : today);
  // The month currently shown inside the popover (independent of `selected`
  // while the user browses around before picking).
  let viewMonth = $state(startOfMonth(value ? keyToDate(value) : new Date()));

  const grid = $derived(monthGrid(viewMonth, app.weekStart));

  // Compact, locale-aware label for the trigger, e.g. "Mon, 8 Jun 2026".
  const triggerLabel = $derived(shortDayLabel(selected));

  function toggle() {
    // Re-anchor the view on the selected day each time we open.
    if (!open) viewMonth = startOfMonth(selected);
    open = !open;
  }

  function pick(d: Date) {
    value = dateKey(d);
    open = false;
  }

  function inViewMonth(d: Date): boolean {
    return d.getMonth() === viewMonth.getMonth();
  }
</script>

<div class="relative">
  <!-- Trigger: mirrors the old native input's chip styling -->
  <button
    type="button"
    class="flex items-center gap-1.5 rounded-md bg-slate-soft px-2.5 py-1 text-xs text-muted transition-colors hover:text-text focus:outline-none focus:ring-1 focus:ring-faint {open ? 'text-text ring-1 ring-faint' : ''}"
    onclick={toggle}
    aria-haspopup="dialog"
    aria-expanded={open}
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    <span class="tabular-nums">{triggerLabel}</span>
  </button>

  {#if open}
    <!-- Trigger sits near the top of the fullscreen panel, so open downward. -->
    <div
      class="absolute top-full right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl border border-slate bg-surface p-3 shadow-2xl shadow-black/50"
      transition:scale={{ duration: 160, start: 0.95, easing: cubicOut }}
      use:clickOutside={() => (open = false)}
      use:trapFocus={() => (open = false)}
      role="dialog"
      aria-label="Pick a date"
    >
      <!-- Month header -->
      <div class="mb-3 flex items-center justify-between">
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
          aria-label="Previous month"
          onclick={() => (viewMonth = addMonths(viewMonth, -1))}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="text-sm font-semibold tracking-tight text-text">{monthLabel(viewMonth)}</span>
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
          aria-label="Next month"
          onclick={() => (viewMonth = addMonths(viewMonth, 1))}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      <!-- Weekday labels -->
      <div class="grid grid-cols-7">
        {#each weekdays as label}
          <div class="pb-1 text-center text-[0.6rem] font-medium uppercase tracking-wider text-muted">
            {label}
          </div>
        {/each}
      </div>

      <!-- Day grid -->
      <div class="grid grid-cols-7 gap-0.5">
        {#each grid as day (day.toISOString())}
          <button
            type="button"
            class="grid h-8 place-items-center rounded-lg text-xs tabular-nums transition-colors
              {isSameDay(day, selected)
                ? 'bg-text font-semibold text-ink'
                : isSameDay(day, today)
                  ? 'text-text ring-1 ring-inset ring-faint hover:bg-slate'
                  : 'text-muted hover:bg-slate hover:text-text'}
              {inViewMonth(day) ? '' : 'opacity-35'}"
            onclick={() => pick(day)}
          >
            {day.getDate()}
          </button>
        {/each}
      </div>

      <!-- Today shortcut -->
      <button
        type="button"
        class="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text"
        onclick={() => pick(today)}
      >
        Today
      </button>
    </div>
  {/if}
</div>
