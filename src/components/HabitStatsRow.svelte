<script lang="ts">
  import { app } from '../lib/store.svelte';
  import HabitMarkIcon from './HabitMarkIcon.svelte';
  import { compactDayLabel, keyToDate, rangeLabel } from '../lib/date';
  import { RECENT_DAYS, type HabitStats } from '../lib/tracker-stats';
  import { tooltip } from '../lib/tooltip';

  /**
   * How one habit is going: its streak now and at its best (both over the
   * whole diary), how often it was done in the period, and its last days.
   */
  let { stats }: { stats: HabitStats } = $props();

  const numberFmt = new Intl.NumberFormat();

  const { habit } = $derived(stats);
  // A streak in progress that is also the longest ever is the one to light up.
  const record = $derived(stats.current > 0 && stats.current >= (stats.best?.length ?? 0));
  const bestDates = $derived(
    stats.best
      ? rangeLabel(keyToDate(stats.best.start), keyToDate(stats.best.end), app.dateFormat)
      : 'No streak yet',
  );
  const since = $derived(
    habit.archived
      ? 'Archived'
      : stats.since
        ? `Tracked since ${compactDayLabel(keyToDate(stats.since), app.dateFormat)}`
        : 'Not marked yet',
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
      <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">Current</p>
      <p
        class="text-lg font-semibold tabular-nums tracking-tight {record ? 'text-sun' : 'text-text'}"
      >
        {#if stats.currentStart}
          <button type="button" class="cursor-help rounded-sm underline decoration-dotted underline-offset-4" use:tooltip={{ label: `${stats.currentStart.estimated ? 'Estimated streak start' : 'Streak started'}: ${compactDayLabel(keyToDate(stats.currentStart.day), app.dateFormat)}`, haptic: app.trackerHaptics }}>{stats.current}</button>
        {:else}
          {stats.current}
        {/if}
        <span class="text-xs font-normal text-muted">{stats.current === 1 ? 'day' : 'days'}</span>
      </p>
      <p class="text-[0.7rem] whitespace-nowrap text-muted">
        {stats.current === 0 ? 'No active streak' : record ? 'Your longest' : 'Active streak'}
      </p>
    </div>
    <div>
      <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">Best</p>
      <p class="text-lg font-semibold tabular-nums tracking-tight text-text">
        {stats.best?.length ?? 0}
        <span class="text-xs font-normal text-muted">{stats.best?.length === 1 ? 'day' : 'days'}</span>
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
        ? 'Not marked in this period'
        : `${numberFmt.format(stats.done)} of ${numberFmt.format(stats.counted)} days`}
    </p>
  </div>

  <!-- A habit not marked lately has nothing to show here but empty rings. -->
  {#if recentDone + recentMissed > 0}
    <div class="col-span-2 flex items-center gap-3 sm:col-span-3">
      <div
        class="flex max-w-xs flex-1 items-center justify-between"
        role="img"
        aria-label="Last {RECENT_DAYS} days: {recentDone} done, {recentMissed} missed"
      >
        {#each stats.recent as mark, i (i)}
          <HabitMarkIcon {mark} dot />
        {/each}
      </div>
      <span class="shrink-0 text-[0.65rem] text-muted">Last {RECENT_DAYS} days</span>
    </div>
  {/if}
</div>
