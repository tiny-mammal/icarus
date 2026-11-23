<script lang="ts">
  import { app } from '../lib/store.svelte';
  import HabitMarkIcon from './HabitMarkIcon.svelte';
  import { compactDayLabel, keyToDate, rangeLabel } from '../lib/date';
  import { RECENT_DAYS, type HabitStats } from '../lib/tracker-stats';
  import { tooltip } from '../lib/tooltip';
  import { fmt, formatNumber, t } from '../lib/i18n/index.svelte';

  /**
   * How one habit is going: its streak now and at its best (both over the
   * whole diary), how often it was done in the period, and its last days.
   */
  let { stats }: { stats: HabitStats } = $props();

  const { habit } = $derived(stats);
  // A streak in progress that is also the longest ever is the one to light up.
  const record = $derived(stats.current > 0 && stats.current >= (stats.best?.length ?? 0));
  const bestDates = $derived(
    stats.best
      ? rangeLabel(keyToDate(stats.best.start), keyToDate(stats.best.end), app.dateFormat)
      : t.stats.habits.noStreakYet,
  );
  const since = $derived(
    habit.archived
      ? t.stats.habits.archived
      : stats.since
        ? fmt(t.stats.habits.trackedSince, {
            date: compactDayLabel(keyToDate(stats.since), app.dateFormat),
          })
        : t.stats.habits.notMarkedYet,
  );
  const recentDone = $derived(stats.recent.filter((mark) => mark === 'done').length);
  const recentMissed = $derived(stats.recent.filter((mark) => mark === 'missed').length);
</script>

<div
  class="grid grid-cols-2 items-center gap-x-6 gap-y-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_7rem]"
>
  <div class="col-span-2 min-w-0 sm:col-span-1">
    <p class="truncate text-sm font-medium text-text">{habit.name}</p>
    <p class="mt-0.5 truncate text-[0.7rem] text-muted">{since}</p>
  </div>

  <div class="flex gap-6">
    <div>
      <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">{t.stats.habits.current}</p>
      <p
        class="text-lg font-semibold tabular-nums tracking-tight {record ? 'text-sun' : 'text-text'}"
      >
        {#if stats.currentStart}
          <button type="button" class="cursor-help rounded-sm underline decoration-dotted underline-offset-4" use:tooltip={{ label: fmt(stats.currentStart.estimated ? t.stats.habits.streakStartedEstimated : t.stats.habits.streakStarted, { date: compactDayLabel(keyToDate(stats.currentStart.day), app.dateFormat) }), haptic: app.trackerHaptics }}>{stats.current}</button>
        {:else}
          {stats.current}
        {/if}
        <span class="text-xs font-normal text-muted">{fmt(t.stats.dayUnit, { count: stats.current })}</span>
      </p>
      <p class="text-[0.7rem] whitespace-nowrap text-muted">
        {stats.current === 0
          ? t.stats.habits.noActiveStreak
          : record
            ? t.stats.habits.longestStreak
            : t.stats.habits.activeStreak}
      </p>
    </div>
    <div>
      <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">{t.stats.habits.best}</p>
      <p class="text-lg font-semibold tabular-nums tracking-tight text-text">
        {stats.best?.length ?? 0}
        <span class="text-xs font-normal text-muted">{fmt(t.stats.dayUnit, { count: stats.best?.length ?? 0 })}</span>
      </p>
      <p class="text-[0.7rem] whitespace-nowrap text-muted">{bestDates}</p>
    </div>
  </div>

  <div class="justify-self-end text-right">
    <p class="text-sm font-semibold tabular-nums text-text">
      {stats.rate === null ? '—' : `${Math.round(stats.rate * 100)}%`}
    </p>
    <div class="mt-1.5 mb-1 h-1 w-28 overflow-hidden rounded-full bg-slate">
      <div class="h-full rounded-full bg-muted" style:width="{(stats.rate ?? 0) * 100}%"></div>
    </div>
    <p class="text-[0.7rem] whitespace-nowrap text-muted">
      {stats.rate === null
        ? t.stats.habits.rateNotMarked
        : fmt(t.stats.habits.rateOf, { done: formatNumber(stats.done), count: stats.counted })}
    </p>
  </div>

  <!-- A habit not marked lately has nothing to show here but empty rings. -->
  {#if recentDone + recentMissed > 0}
    <div class="col-span-2 flex items-center gap-3 sm:col-span-3">
      <div
        class="flex max-w-xs flex-1 items-center justify-between"
        role="img"
        aria-label={fmt(t.stats.habits.lastDaysSummary, { count: RECENT_DAYS, done: recentDone, missed: recentMissed })}
      >
        {#each stats.recent as mark, i (i)}
          <HabitMarkIcon {mark} dot />
        {/each}
      </div>
      <span class="shrink-0 text-[0.65rem] text-muted">{fmt(t.stats.habits.lastDays, { count: RECENT_DAYS })}</span>
    </div>
  {/if}
</div>
