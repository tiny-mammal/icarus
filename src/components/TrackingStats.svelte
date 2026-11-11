<script lang="ts">
  import { app } from '../lib/store.svelte';
  import HabitMarkIcon from './HabitMarkIcon.svelte';
  import HabitStatsRow from './HabitStatsRow.svelte';
  import StatTile from './StatTile.svelte';
  import TrendChart from './TrendChart.svelte';
  import { keyToDate, monthYearLabel } from '../lib/date';
  import { periodLabel, type StatsPeriod } from '../lib/stats';
  import { sunColor } from '../lib/sun';
  import { computeTrackerStats } from '../lib/tracker-stats';

  /** How the day scores and the habits went in the period. */
  let { period }: { period: StatsPeriod } = $props();

  const numberFmt = new Intl.NumberFormat();
  const oneDecimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

  const stats = $derived(computeTrackerStats(app.tracker, period, new Date(), app.dateFormat));
  const periodText = $derived(periodLabel(period, app.dateFormat));
  const score = $derived(stats.score);
  const run = $derived(score.run);
  // A run still going that is also the longest ever is the one to light up.
  const runIsRecord = $derived(
    run !== null && run.passed && run.length >= (score.best?.length ?? 0),
  );
  const distributionMax = $derived(Math.max(1, ...score.distribution));

  const days = (n: number) => `${numberFmt.format(n)} ${n === 1 ? 'day' : 'days'}`;
</script>

{#if stats.empty}
  <p class="rounded-xl border border-dashed border-slate px-4 py-10 text-center text-sm text-muted">
    Nothing scored or marked in this period.
  </p>
{:else}
  <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr))]">
    <StatTile
      label="Avg. score"
      value={score.average === null ? '—' : oneDecimal.format(score.average)}
      unit={score.average === null ? undefined : `/ ${score.scale}`}
      sub="{days(score.scored)} scored"
      color={score.average === null
        ? undefined
        : sunColor({ value: score.average, scale: score.scale })}
    />
    <StatTile
      label="Passing days"
      value={score.passRate === null ? '—' : `${Math.round(score.passRate * 100)}%`}
      sub="{numberFmt.format(score.passed)} of {days(score.scored)}"
    />
    {#if app.tracker.passStreak}
      <StatTile
        label="Current run"
        value={run ? numberFmt.format(run.length) : '—'}
        unit={run ? (run.length === 1 ? 'day' : 'days') : undefined}
        sub={run ? (run.passed ? 'Passing' : 'Failing') : 'Nothing scored yet'}
        color={runIsRecord ? 'var(--color-sun)' : undefined}
      />
      <StatTile
        label="Best run"
        value={score.best ? numberFmt.format(score.best.length) : '—'}
        unit={score.best ? (score.best.length === 1 ? 'day' : 'days') : undefined}
        sub={score.best
          ? run?.passed && run.length >= score.best.length
            ? 'Still going'
            : `Until ${monthYearLabel(keyToDate(score.best.end))}`
          : 'No passing day yet'}
      />
    {/if}
  </div>

  <div class="mt-6">
    <div class="mb-3 flex items-end justify-between gap-4">
      <h3 class="text-sm font-medium text-text">Score over time</h3>
      <p class="text-[0.7rem] text-muted">{periodText}</p>
    </div>
    {#if score.scored > 0}
      <TrendChart
        timeline={score.timeline}
        label="Average score over the selected period"
        yMin={1}
        yMax={score.scale}
        ticks={[1, Math.ceil(score.scale / 2), score.scale]}
        reference={{ value: score.passMark, label: `Pass mark (${score.passMark})` }}
        rate={false}
      >
        {#snippet tooltip(bin)}
          <p class="text-xs whitespace-nowrap text-text">
            {#if bin.count > 0}
              {oneDecimal.format(bin.value)}
              <span class="text-muted">
                average · {days(bin.count)} scored
              </span>
            {:else}
              <span class="text-muted">No score</span>
            {/if}
          </p>
          {#if bin.average !== null}
            <p class="text-[0.65rem] whitespace-nowrap text-muted">
              {oneDecimal.format(bin.average)}, {score.timeline.averageDays}-day average
            </p>
          {/if}
        {/snippet}
      </TrendChart>
    {:else}
      <div
        class="grid h-48 place-items-center rounded-xl border border-dashed border-slate px-4 text-center text-sm text-muted"
      >
        No days scored in this period.
      </div>
    {/if}
  </div>

  {#if score.scored > 0}
    <div class="mt-6">
      <div class="mb-3 flex items-end justify-between gap-4">
        <h3 class="text-sm font-medium text-text">Score distribution</h3>
        <p class="text-[0.7rem] text-muted">Days given each score</p>
      </div>
      <ul class="flex h-20 items-end gap-1.5" aria-label="Days given each score">
        {#each score.distribution as count, i}
          {@const value = i + 1}
          <li
            class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            aria-label="Score {value}: {days(count)}"
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
        <h3 class="text-sm font-medium text-text">Habits</h3>
        <p class="text-right text-[0.7rem] text-muted">Streaks span all time; rates follow the period</p>
      </div>
      <div class="divide-y divide-slate">
        {#each stats.habits as habitStats (habitStats.habit.id)}
          <HabitStatsRow stats={habitStats} />
        {/each}
      </div>
      <!-- Says what the dots in each habit's last days mean. -->
      <div class="mt-1 flex items-center justify-end gap-4 text-[0.65rem] text-muted">
        <span class="flex items-center gap-1.5"><HabitMarkIcon mark="done" dot />Done</span>
        <span class="flex items-center gap-1.5"><HabitMarkIcon mark="missed" dot />Missed</span>
        <span class="flex items-center gap-1.5"><HabitMarkIcon mark={undefined} dot />Not marked</span>
      </div>
    </div>
  {/if}
{/if}
