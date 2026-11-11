<script lang="ts">
  import { keyToDate, monthYearLabel } from '../lib/date';
  import { tooltip } from '../lib/tooltip';
  import type { ScoreStats } from '../lib/tracker-stats';
  import StatTile from './StatTile.svelte';

  /** The longest passing and failing runs share one tile, starting with the best. */
  let { score }: { score: ScoreStats } = $props();

  const numberFmt = new Intl.NumberFormat();
  let best = $state(true);
  const record = $derived(best ? score.best : score.worst);
  const label = $derived(best ? 'Best run' : 'Worst run');
  const switchLabel = $derived(best ? 'Show worst run' : 'Show best run');
  const value = $derived(record ? numberFmt.format(record.length) : '—');
  const unit = $derived(record ? (record.length === 1 ? 'day' : 'days') : undefined);
  const ongoing = $derived(record !== null && score.run !== null
    && score.run.passed === best && score.run.length >= record.length);
  const sub = $derived(record
    ? ongoing ? 'Still going' : `Until ${monthYearLabel(keyToDate(record.end))}`
    : best ? 'No passing day yet' : 'No failing day yet');
</script>

<button
  type="button"
  class="group min-w-0 rounded-xl text-left transition-shadow hover:ring-1 hover:ring-faint"
  aria-label="{label}: {value}{unit ? ` ${unit}` : ''}. {sub}. {switchLabel}"
  use:tooltip={switchLabel}
  onclick={() => best = !best}
>
  <StatTile
    {label}
    {value}
    {unit}
    {sub}
  >
    {#snippet header()}
      <div class="flex h-4 items-center justify-between gap-2 text-muted">
        <span class="text-[0.65rem] font-medium tracking-wider uppercase">{label}</span>
        <svg class="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" />
        </svg>
      </div>
    {/snippet}
  </StatTile>
</button>
