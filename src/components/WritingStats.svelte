<script lang="ts">
  import { app } from '../lib/store.svelte';
  import StatTile from './StatTile.svelte';
  import TrendChart from './TrendChart.svelte';
  import { shortDayLabel } from '../lib/date';
  import { computeStats, periodLabel, type DayStat, type StatsPeriod } from '../lib/stats';

  /** What was written in the period: totals, characters per day and the busiest days. */
  let { period }: { period: StatsPeriod } = $props();

  const numberFmt = new Intl.NumberFormat();

  const stats = $derived(computeStats(app.entries, period, new Date(), app.dateFormat));
  const periodText = $derived(periodLabel(period, app.dateFormat));
  const timeline = $derived(stats.timeline);

  function barWidth(day: DayStat): number {
    const top = stats.ranking[0]?.chars ?? 0;
    if (top <= 0 || day.chars <= 0) return 0;
    return Math.max(2, (day.chars / top) * 100);
  }

  function openDay(day: DayStat) {
    app.openDay(day.key);
    app.statsOpen = false;
  }
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
  <StatTile label="Entries" value={numberFmt.format(stats.totalEntries)} sub={periodText} />
  <StatTile label="Characters" value={numberFmt.format(stats.totalChars)} sub={periodText} />
  <StatTile
    label="Avg. entry"
    value={stats.totalEntries > 0 ? numberFmt.format(Math.round(stats.averageChars)) : '—'}
    sub="Characters per entry"
  />
  <StatTile
    label="Best day"
    small
    value={stats.bestDay ? shortDayLabel(stats.bestDay.date, app.dateFormat) : '—'}
    sub={stats.bestDay ? `${numberFmt.format(stats.bestDay.chars)} characters` : periodText}
  />
</div>

<!-- Evolution chart -->
<div class="mt-6">
  <div class="mb-3 flex items-end justify-between gap-4">
    <h3 class="text-sm font-medium text-text">Characters per day</h3>
    <p class="text-[0.7rem] text-muted">{periodText}</p>
  </div>

  {#if timeline.bins.length > 0 && stats.totalChars > 0}
    <TrendChart {timeline} label="Characters written over the selected period">
      {#snippet tooltip(bin)}
        <p class="text-xs whitespace-nowrap text-text">
          {numberFmt.format(bin.total)}
          <span class="text-muted">
            characters · {bin.count}
            {bin.count === 1 ? 'entry' : 'entries'}
          </span>
        </p>
        <p class="text-[0.65rem] whitespace-nowrap text-muted">
          {numberFmt.format(Math.round(bin.average ?? 0))} per day,
          {timeline.averageDays}-day average
        </p>
      {/snippet}
    </TrendChart>
  {:else}
    <div
      class="grid h-48 place-items-center rounded-xl border border-dashed border-slate px-4 text-center text-sm text-muted"
    >
      {stats.totalEntries === 0 ? 'No entries in this period.' : 'Nothing written in this period.'}
    </div>
  {/if}
</div>

<!-- Top days -->
<div class="mt-6">
  <div class="mb-2 flex items-end justify-between gap-4">
    <h3 class="text-sm font-medium text-text">Top days</h3>
    <p class="text-[0.7rem] text-muted">By characters written</p>
  </div>
  {#if stats.ranking.length > 0}
    <ol class="space-y-0.5">
      {#each stats.ranking as day, i (day.key)}
        <li>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-soft"
            onclick={() => openDay(day)}
          >
            <span class="w-5 shrink-0 font-mono text-xs tabular-nums text-muted">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-baseline justify-between gap-3">
                <span class="truncate text-sm text-text">{shortDayLabel(day.date, app.dateFormat)}</span>
                <span class="shrink-0 text-xs tabular-nums text-muted">
                  {numberFmt.format(day.chars)}
                </span>
              </span>
              <span class="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate">
                <span class="block h-full rounded-full bg-muted" style:width="{barWidth(day)}%"></span>
              </span>
            </span>
          </button>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="rounded-xl border border-dashed border-slate px-4 py-6 text-center text-sm text-muted">
      No entries in this period.
    </p>
  {/if}
</div>
