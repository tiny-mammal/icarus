<script lang="ts">
  import { tick } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade, scale } from 'svelte/transition';
  import { app } from '../lib/store.svelte';
  import { clickOutside } from '../lib/actions';
  import { dateKey } from '../lib/date';
  import {
    STATS_PRESETS,
    isCustomRange,
    periodLabel,
    periodRange,
    type StatsPeriod,
  } from '../lib/stats';
  import DateRangePicker from './DateRangePicker.svelte';

  /**
   * The statistics period: a listbox of presets whose last option, "Custom
   * range…", turns the same popover into a range calendar.
   */
  let { period = $bindable() }: { period: StatsPeriod } = $props();

  const CUSTOM = 'custom';
  const options = [...STATS_PRESETS, { value: CUSTOM, label: 'Custom range…' }] as const;
  type OptionValue = (typeof options)[number]['value'];

  const current = $derived<OptionValue>(isCustomRange(period) ? CUSTOM : period);
  const label = $derived(periodLabel(period, app.dateFormat));

  let open = $state(false);
  let view = $state<'list' | 'range'>('list');
  let selectIdx = $state(0);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let popoverEl = $state<HTMLDivElement | null>(null);

  // The range calendar opens on the period on show, so a preset is a
  // starting point to adjust rather than a blank slate.
  const initialRange = $derived(view === 'range' ? periodRange(period, app.entries) : null);

  function openList() {
    selectIdx = Math.max(0, options.findIndex((o) => o.value === current));
    view = 'list';
    open = true;
    focusIn();
  }

  function close() {
    open = false;
    triggerEl?.focus();
  }

  function focusIn() {
    void tick().then(() => {
      const target =
        view === 'list'
          ? popoverEl?.querySelectorAll<HTMLElement>('[role="option"]')[selectIdx]
          : popoverEl?.querySelector<HTMLElement>('[data-key][tabindex="0"]');
      target?.focus();
    });
  }

  function choose(value: OptionValue) {
    if (value === CUSTOM) {
      view = 'range';
      focusIn();
      return;
    }
    period = value;
    close();
  }

  function apply(range: { start: Date; end: Date }) {
    period = { start: dateKey(range.start), end: dateKey(range.end) };
    close();
  }

  function backToList() {
    view = 'list';
    selectIdx = options.length - 1;
    focusIn();
  }

  // One handler for the trigger and the popover, so the keys work wherever
  // focus sits inside the picker. It is bound natively (see `keys`): Svelte
  // delegates `onkeydown` to the root, too late to keep an Escape from the
  // modal card's own handler.
  function keys(node: HTMLElement) {
    node.addEventListener('keydown', onKey);
    return { destroy: () => node.removeEventListener('keydown', onKey) };
  }

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape') {
      // Close only the popover — the modal's own Escape handler must not fire.
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (view !== 'list') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      selectIdx = (selectIdx + delta + options.length) % options.length;
      focusIn();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      selectIdx = e.key === 'Home' ? 0 : options.length - 1;
      focusIn();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(options[selectIdx].value);
    }
  }
</script>

<div
  class="relative"
  use:keys
  use:clickOutside={() => (open = false)}
  onfocusout={(e) => {
    // Tabbing out of the picker dismisses it. Moving focus within it must
    // not, nor losing it when the focused option is swapped for the range
    // calendar (focus drops to the body until the calendar takes it).
    const wrapper = e.currentTarget;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && !wrapper.contains(active)) open = false;
    });
  }}
>
  <button
    bind:this={triggerEl}
    type="button"
    class="flex max-w-[11.5rem] items-center gap-1.5 rounded-lg border border-slate px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text sm:max-w-none
      {open ? 'border-faint text-text' : ''}"
    onclick={() => (open ? (open = false) : openList())}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label="Statistics period: {label}"
  >
    {#if current === CUSTOM}
      <svg class="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    {/if}
    <span class="truncate tabular-nums">{label}</span>
    <svg
      class="shrink-0 transition-transform {open ? '[transform:rotate(180deg)]' : ''}"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  {#if open}
    <div
      bind:this={popoverEl}
      class="absolute top-full right-0 z-popover mt-2 origin-top-right rounded-2xl border border-slate bg-surface shadow-2xl shadow-black/50
        {view === 'list' ? 'w-48 p-1' : 'w-[min(19.5rem,calc(100vw-4.5rem))] p-3'}"
      transition:scale={{ duration: 140, start: 0.96, easing: cubicOut }}
    >
      {#if view === 'list'}
        <div role="listbox" aria-label="Statistics period" tabindex="-1">
          {#each options as option, i (option.value)}
            {#if option.value === CUSTOM}
              <div class="mx-2 my-1 h-px bg-slate" role="presentation"></div>
            {/if}
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors sm:py-1.5 sm:text-xs
                {i === selectIdx ? 'bg-slate text-text' : 'text-muted hover:bg-slate-soft hover:text-text'}"
              role="option"
              aria-selected={option.value === current}
              tabindex="-1"
              onclick={() => choose(option.value)}
              onpointerenter={() => (selectIdx = i)}
            >
              <span class="min-w-0">
                <span class="block">{option.label}</span>
                {#if option.value === CUSTOM && current === CUSTOM}
                  <span class="mt-0.5 block truncate text-[0.7rem] tabular-nums text-muted">{label}</span>
                {/if}
              </span>
              {#if option.value === current}
                <svg class="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      {:else}
        <div role="dialog" aria-label="Custom range" in:fade={{ duration: 120 }}>
          <DateRangePicker initial={initialRange} onapply={apply} oncancel={backToList} />
        </div>
      {/if}
    </div>
  {/if}
</div>
