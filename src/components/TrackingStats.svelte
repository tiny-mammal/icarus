<script lang="ts">
  import { app } from '../lib/store.svelte';
  import HabitMarkIcon from './HabitMarkIcon.svelte';
  import HabitStatsRow from './HabitStatsRow.svelte';
  import StatTile from './StatTile.svelte';
  import RunStatTile from './RunStatTile.svelte';
  import TrendChart from './TrendChart.svelte';
  import { periodLabel, type StatsPeriod } from '../lib/stats';
  import { sunColor } from '../lib/sun';
  import { computeTrackerStats } from '../lib/tracker-stats';
  import { fmt, formatNumber, t } from '../lib/i18n/index.svelte';

  /** How the day scores and the habits went in the period. */
  let { period }: { period: StatsPeriod } = $props();

  const oneDecimal = (n: number) => formatNumber(n, { maximumFractionDigits: 1 });

  const stats = $derived(computeTrackerStats(app.tracker, period, new Date(), app.dateFormat));
  const periodText = $derived(periodLabel(period, app.dateFormat));
  const score = $derived(stats.score);
  const run = $derived(score.run);
  // A run still going that is also the longest ever is the one to light up.
  const runIsRecord = $derived(
    run !== null && run.passed && run.length >= (score.best?.length ?? 0),
  );
  const distributionMax = $derived(Math.max(1, ...score.distribution));

  const days = (count: number) => fmt(t.common.days, { count });
</script>

{#if stats.empty}
  <p class="rounded-xl border border-dashed border-slate px-4 py-10 text-center text-sm text-muted">
    {t.stats.tracking.nothingTracked}
  </p>
{:else}
  <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr))]">
    <StatTile
      label={t.stats.tracking.averageScore}
      value={score.average === null ? '—' : oneDecimal(score.average)}
      unit={score.average === null ? undefined : `/ ${score.scale}`}
      sub={fmt(t.stats.tracking.daysScored, { count: score.scored })}
      color={score.average === null
        ? undefined
        : sunColor({ value: score.average, scale: score.scale })}
    />
    <StatTile
      label={t.stats.tracking.passingDays}
      value={score.passRate === null ? '—' : formatNumber(score.passRate, { style: 'percent', maximumFractionDigits: 0 })}
      sub={fmt(t.stats.tracking.passedOfScored, { passed: formatNumber(score.passed), count: score.scored })}
    />
    {#if app.tracker.passStreak}
      <StatTile
        label={t.stats.tracking.currentRun}
        value={run ? formatNumber(run.length) : '—'}
        unit={run ? fmt(t.stats.dayUnit, { count: run.length }) : undefined}
        sub={run
          ? run.passed
            ? t.stats.tracking.runPassing
            : t.stats.tracking.runFailing
          : t.stats.tracking.runNothingScored}
        color={runIsRecord ? 'var(--color-sun)' : undefined}
      />
      <RunStatTile {score} />
    {/if}
  </div>

  <div class="mt-6">
    <div class="mb-3 flex items-end justify-between gap-4">
      <h3 class="text-sm font-medium text-text">{t.stats.tracking.scoreOverTime}</h3>
      <p class="text-[0.7rem] text-muted">{periodText}</p>
    </div>
    {#if score.scored > 0}
      <TrendChart
        timeline={score.timeline}
        label={t.stats.tracking.chartLabel}
        yMin={1}
        yMax={score.scale}
        ticks={[1, Math.ceil(score.scale / 2), score.scale]}
        reference={{ value: score.passMark, label: fmt(t.stats.tracking.passMark, { score: score.passMark }) }}
        rate={false}
      >
        {#snippet tooltip(bin)}
          <p class="text-xs whitespace-nowrap text-text">
            {#if bin.count > 0}
              {fmt(t.stats.tracking.chartAverage, {
                value: oneDecimal(bin.value),
                days: fmt(t.stats.tracking.daysScored, { count: bin.count }),
              })}
            {:else}
              <span class="text-muted">{t.stats.tracking.chartNoScore}</span>
            {/if}
          </p>
          {#if bin.average !== null}
            <p class="text-[0.65rem] whitespace-nowrap text-muted">
              {fmt(t.stats.tracking.chartMovingAverage, {
                value: oneDecimal(bin.average),
                count: score.timeline.averageDays,
              })}
            </p>
          {/if}
        {/snippet}
      </TrendChart>
    {:else}
      <div
        class="grid h-48 place-items-center rounded-xl border border-dashed border-slate px-4 text-center text-sm text-muted"
      >
        {t.stats.tracking.noScoredDays}
      </div>
    {/if}
  </div>

  {#if score.scored > 0}
    <div class="mt-6">
      <div class="mb-3 flex items-end justify-between gap-4">
        <h3 class="text-sm font-medium text-text">{t.stats.tracking.scoreDistribution}</h3>
        <p class="text-[0.7rem] text-muted">{t.stats.tracking.daysGivenEachScore}</p>
      </div>
      <ul class="flex h-20 items-end gap-1.5" aria-label={t.stats.tracking.daysGivenEachScore}>
        {#each score.distribution as count, i}
          {@const value = i + 1}
          <li
            class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            aria-label={fmt(t.stats.tracking.scoreDays, { value, days: days(count) })}
          >
            <span class="text-[0.6rem] tabular-nums text-muted">{count > 0 ? count : ''}</span>
            <span
              class="block w-full rounded-t-[3px]"
              style:height="{count > 0 ? Math.max(3, (count / distributionMax) * 44) : 1}px"
              style:background-color={count > 0
                ? sunColor({ value, scale: score.scale }, 0.8)
                : 'var(--color-slate)'}
            ></span>
            <span class="text-[0.65rem] tabular-nums text-muted">{value}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if stats.habits.length > 0}
    <div class="mt-6">
      <div class="mb-1 flex items-end justify-between gap-4">
        <h3 class="text-sm font-medium text-text">{t.stats.habits.title}</h3>
        <p class="text-right text-[0.7rem] text-muted">{t.stats.habits.hint}</p>
      </div>
      <div class="divide-y divide-slate">
        {#each stats.habits as habitStats (habitStats.habit.id)}
          <HabitStatsRow stats={habitStats} />
        {/each}
      </div>
      <!-- Says what the dots in each habit's last days mean. -->
      <div class="mt-1 flex items-center justify-end gap-4 text-[0.65rem] text-muted">
        <span class="flex items-center gap-1.5"><HabitMarkIcon mark="done" dot />{t.stats.habits.done}</span>
        <span class="flex items-center gap-1.5"><HabitMarkIcon mark="missed" dot />{t.stats.habits.missed}</span>
        <span class="flex items-center gap-1.5"><HabitMarkIcon mark={undefined} dot />{t.stats.habits.notMarked}</span>
      </div>
    </div>
  {/if}
{/if}
