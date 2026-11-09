<script lang="ts">
  import { monthShortLabels } from '../lib/date';

  /**
   * A year stepper over the twelve months of that year: the fast way to jump
   * across a diary that spans many years. Shared by the calendar header and
   * the small pickers.
   */
  let {
    year = $bindable(),
    selected = null,
    onpick,
  }: {
    /** The year being browsed. */
    year: number;
    /** Month to highlight as chosen, if any. */
    selected?: { year: number; month: number } | null;
    onpick: (month: number) => void;
  } = $props();

  const today = new Date();
  const months = monthShortLabels();
</script>

<div class="mb-3 flex items-center justify-between">
  <button
    type="button"
    class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
    aria-label="Previous year"
    onclick={() => (year -= 1)}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  </button>
  <span class="text-sm font-semibold tabular-nums tracking-tight text-text" aria-live="polite">{year}</span>
  <button
    type="button"
    class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
    aria-label="Next year"
    onclick={() => (year += 1)}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </button>
</div>

<div class="grid grid-cols-3 gap-1.5">
  {#each months as label, month (month)}
    {@const chosen = selected?.year === year && selected.month === month}
    {@const current = today.getFullYear() === year && today.getMonth() === month}
    <button
      type="button"
      class="rounded-lg py-2 text-sm font-medium tabular-nums transition-colors
        {chosen
          ? 'bg-text text-ink'
          : current
            ? 'text-text ring-1 ring-inset ring-faint hover:bg-slate'
            : 'text-muted hover:bg-slate hover:text-text'}"
      aria-pressed={chosen}
      onclick={() => onpick(month)}
    >
      {label}
    </button>
  {/each}
</div>
