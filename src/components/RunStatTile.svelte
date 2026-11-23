<script lang="ts">
  import { keyToDate, monthYearLabel } from '../lib/date';
  import { tooltip } from '../lib/tooltip';
  import { fmt, formatNumber, t } from '../lib/i18n/index.svelte';
  import type { ScoreStats } from '../lib/tracker-stats';
  import StatTile from './StatTile.svelte';

  /** The longest passing and failing runs share one tile, starting with the best. */
  let { score }: { score: ScoreStats } = $props();

  let best = $state(true);
  const record = $derived(best ? score.best : score.worst);
  const label = $derived(best ? t.stats.tracking.bestRun : t.stats.tracking.worstRun);
  const switchLabel = $derived(best ? t.stats.tracking.showWorstRun : t.stats.tracking.showBestRun);
  const value = $derived(record ? formatNumber(record.length) : '—');
  const unit = $derived(record ? fmt(t.stats.dayUnit, { count: record.length }) : undefined);
  const ongoing = $derived(record !== null && score.run !== null
    && score.run.passed === best && score.run.length >= record.length);
  const sub = $derived(record
    ? ongoing
      ? t.stats.tracking.runStillGoing
      : fmt(t.stats.tracking.runUntil, { date: monthYearLabel(keyToDate(record.end)) })
    : best
      ? t.stats.tracking.noPassingDay
      : t.stats.tracking.noFailingDay);
  const ariaLabel = $derived(
    fmt(t.stats.tracking.runTileLabel, {
      label,
      value: record ? fmt(t.common.days, { count: record.length }) : value,
      detail: sub,
      action: switchLabel,
    }),
  );
</script>

<button
  type="button"
  class="group min-w-0 rounded-xl text-left transition-shadow hover:ring-1 hover:ring-faint"
  aria-label={ariaLabel}
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
