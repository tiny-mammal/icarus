<script lang="ts">
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { clickOutside, trapFocus } from '../lib/actions';
  import { app } from '../lib/store.svelte';
  import { dateKey, keyToDate, startOfMonth, nearDayLabel } from '../lib/date';
  import MiniCalendar from './MiniCalendar.svelte';

  // Bound to a local `YYYY-MM-DD` key (e.g. app.draftDateKey).
  // `align` picks which edge of the trigger the popover hangs from.
  let {
    value = $bindable(),
    align = 'right',
  }: { value: string; align?: 'left' | 'right' } = $props();

  const today = new Date();

  let open = $state(false);
  // Resolve the bound key to a Date, falling back to today if it's missing.
  const selected = $derived(value ? keyToDate(value) : today);
  // The month currently shown inside the popover (independent of `selected`
  // while the user browses around before picking).
  let viewMonth = $state(startOfMonth(value ? keyToDate(value) : new Date()));

  // Compact, locale-aware label for the trigger, e.g. "Mon, 8 Jun" (the year
  // only when it isn't this one).
  const triggerLabel = $derived(nearDayLabel(selected, app.dateFormat, today));

  function toggle() {
    // Re-anchor the view on the selected day each time we open.
    if (!open) viewMonth = startOfMonth(selected);
    open = !open;
  }

  function pick(d: Date) {
    value = dateKey(d);
    open = false;
  }
</script>

<div class="relative" use:clickOutside={() => (open = false)}>
  <!-- Trigger: mirrors the old native input's chip styling -->
  <button
    type="button"
    class="flex items-center gap-1.5 rounded-md bg-slate-soft px-2.5 py-2 text-xs sm:py-1 text-muted transition-colors hover:text-text focus:outline-none focus:ring-1 focus:ring-faint {open ? 'text-text ring-1 ring-faint' : ''}"
    onclick={toggle}
    aria-haspopup="dialog"
    aria-expanded={open}
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    <span class="tabular-nums">{triggerLabel}</span>
  </button>

  {#if open}
    <!-- Trigger sits near the top of the editor, so open downward. -->
    <div
      class="absolute top-full z-popover mt-2 w-72 rounded-2xl {align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'} border border-slate bg-surface p-3 shadow-2xl shadow-black/50"
      transition:scale={{ duration: 160, start: 0.95, easing: cubicOut }}
      use:trapFocus={() => (open = false)}
      role="dialog"
      aria-label="Pick a date"
    >
      <MiniCalendar bind:month={viewMonth} start={selected} end={selected} onpick={pick} />

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
