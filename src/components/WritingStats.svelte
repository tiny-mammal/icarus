<script lang="ts">
  import { app } from '../lib/store.svelte';
  import StatTile from './StatTile.svelte';
  import TrendChart from './TrendChart.svelte';
  import { shortDayLabel } from '../lib/date';
  import { fmt, formatNumber, t } from '../lib/i18n/index.svelte';
  import { computeStats, periodLabel, type DayStat, type StatsPeriod } from '../lib/stats';

  /** What was written in the period: totals, characters per day and the busiest days. */
  let { period }: { period: StatsPeriod } = $props();

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
  <StatTile label={t.stats.writing.entries} value={formatNumber(stats.totalEntries)} sub={periodText} />
  <StatTile label={t.stats.writing.characters} value={formatNumber(stats.totalChars)} sub={periodText} />
  <StatTile
    label={t.stats.writing.averageEntry}
    value={stats.totalEntries > 0 ? formatNumber(Math.round(stats.averageChars)) : '—'}
    sub={t.stats.writing.charactersPerEntry}
  />
  <StatTile
    label={t.stats.writing.bestDay}
    small
    value={stats.bestDay ? shortDayLabel(stats.bestDay.date, app.dateFormat) : '—'}
    sub={stats.bestDay ? fmt(t.stats.characters, { count: stats.bestDay.chars }) : periodText}
  />
</div>

<!-- Evolution chart -->
<div class="mt-6">
  <div class="mb-3 flex items-end justify-between gap-4">
    <h3 class="text-sm font-medium text-text">{t.stats.writing.charactersPerDay}</h3>
    <p class="text-[0.7rem] text-muted">{periodText}</p>
  </div>

  {#if timeline.bins.length > 0 && stats.totalChars > 0}
    <TrendChart {timeline} label={t.stats.writing.chartLabel}>
      {#snippet tooltip(bin)}
        <p class="text-xs whitespace-nowrap text-text">
          {fmt(t.stats.writing.chartTotals, {
            characters: fmt(t.stats.characters, { count: bin.total }),
            entries: fmt(t.common.entries, { count: bin.count }),
          })}
        </p>
        <p class="text-[0.65rem] whitespace-nowrap text-muted">
          {fmt(t.stats.writing.chartPerDayAverage, {
            value: formatNumber(Math.round(bin.average ?? 0)),
            count: timeline.averageDays,
          })}
        </p>
      {/snippet}
    </TrendChart>
  {:else}
    <div
      class="grid h-48 place-items-center rounded-xl border border-dashed border-slate px-4 text-center text-sm text-muted"
    >
      {stats.totalEntries === 0 ? t.stats.writing.noEntries : t.stats.writing.nothingWritten}
    </div>
  {/if}
</div>

<!-- Top days -->
<div class="mt-6">
  <div class="mb-2 flex items-end justify-between gap-4">
    <h3 class="text-sm font-medium text-text">{t.stats.writing.topDays}</h3>
    <p class="text-[0.7rem] text-muted">{t.stats.writing.topDaysHint}</p>
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
                  {formatNumber(day.chars)}
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
      {t.stats.writing.noEntries}
    </p>
  {/if}
</div>
