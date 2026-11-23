<script lang="ts">
  import { tick } from 'svelte';
  import { app } from '../lib/store.svelte';
  import { activeHabits, dayRecord, nextMark } from '../lib/tracker';
  import type { Habit, HabitMark } from '../lib/types';
  import { selectionHaptic } from '../lib/haptics';
  import { fmt, t } from '../lib/i18n/index.svelte';
  import ScoreTrack from './ScoreTrack.svelte';
  import HabitMarkIcon from './HabitMarkIcon.svelte';

  /**
   * One day's score and habits, changed in place and saved as they change.
   * Each habit shows the streak it had that day; tapping the number sets it
   * by hand, and the days after count on from there.
   */
  let { dayKey, onmanage }: { dayKey: string; onmanage: () => void } = $props();

  const record = $derived(dayRecord(app.tracker, dayKey));
  const habits = $derived(activeHabits(app.tracker));
  const scale = $derived(app.tracker.scoreScale);
  const score = $derived(record.score);
  // A score given before the scale changed is kept, but can't sit on these bars.
  const oldScale = $derived(score !== undefined && score.scale !== scale);

  function markName(mark: HabitMark | undefined): string {
    if (mark === 'done') return t.tracker.markDone;
    if (mark === 'missed') return t.tracker.markMissed;
    return t.tracker.markNone;
  }
  function markLabel(habit: Habit): string {
    const mark = record.marks[habit.id];
    return fmt(t.tracker.markLabel, { habit: habit.name, state: markName(mark), next: markName(nextMark(mark)) });
  }

  function markHabit(habit: Habit) {
    app.setHabitMark(dayKey, habit.id, nextMark(record.marks[habit.id]));
    if (app.trackerHaptics) void selectionHaptic();
  }

  const days = (count: number) => fmt(t.common.days, { count });

  // --- setting a streak by hand -------------------------------------------
  let editingStreak = $state<string | null>(null);
  let streakDraft = $state('');
  let streakInput = $state<HTMLInputElement | null>(null);
  let list = $state<HTMLElement | null>(null);

  async function editStreak(habit: Habit) {
    editingStreak = habit.id;
    streakDraft = String(app.streakOn(habit.id, dayKey));
    await tick();
    streakInput?.select();
  }

  /**
   * Leave the streak field, keeping focus on the number it replaced unless
   * focus was on its way to another control.
   */
  async function closeStreak(id: string, restoreFocus = true) {
    editingStreak = null;
    await tick();
    if (restoreFocus) list?.querySelector<HTMLElement>(`[data-streak="${id}"]`)?.focus();
  }

  function commitStreak(restoreFocus = true) {
    const id = editingStreak;
    if (!id) return;
    void closeStreak(id, restoreFocus);
    const text = streakDraft.trim();
    if (!text) {
      app.setHabitStreak(dayKey, id, null);
      return;
    }
    const length = Number(text);
    if (!Number.isInteger(length) || length < 0) return;
    // Only pin the number when it differs from what the marks already give.
    if (record.streaks[id] !== undefined || length !== app.streakOn(id, dayKey)) {
      app.setHabitStreak(dayKey, id, length);
    }
  }

  function onStreakKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitStreak();
    } else if (e.key === 'Escape') {
      // Leave the field, not the whole panel.
      e.stopPropagation();
      if (editingStreak) void closeStreak(editingStreak);
    }
  }

  // --- adding a habit -------------------------------------------------------
  let newHabit = $state('');
  function add(e: SubmitEvent) {
    e.preventDefault();
    if (!newHabit.trim()) return;
    app.addHabit(newHabit);
    newHabit = '';
  }
</script>

<section aria-labelledby="tracker-score">
  <div class="flex items-baseline justify-between gap-3">
    <h3 id="tracker-score" class="text-xs font-medium text-muted">{t.tracker.score}</h3>
    <p class="text-xs tabular-nums text-muted">
      {#if score && !oldScale}
        <span class="font-medium text-text">
          {fmt(t.tracker.scoreOf, { value: score.value, scale })}
        </span>
      {:else if score}
        {fmt(t.tracker.scoreOldScale, { value: score.value, scale: score.scale })}
      {:else}
        {t.tracker.notScored}
      {/if}
    </p>
  </div>
  <div class="mt-2">
    <ScoreTrack
      value={score && !oldScale ? score.value : null}
      {scale}
      haptics={app.trackerHaptics}
      onchange={(value) => app.setDayScore(dayKey, value)}
    />
  </div>
</section>

<section class="mt-5" aria-labelledby="tracker-habits">
  <div class="flex items-baseline justify-between gap-3">
    <h3 id="tracker-habits" class="text-xs font-medium text-muted">{t.tracker.habits}</h3>
    {#if habits.length}
      <button type="button" class="text-xs text-muted transition-colors hover:text-text" onclick={onmanage}>
        {t.tracker.editHabits}
      </button>
    {/if}
  </div>

  {#if habits.length}
    <ul class="-mx-2 mt-1.5" bind:this={list}>
      {#each habits as habit (habit.id)}
        {@const mark = record.marks[habit.id]}
        {@const setByHand = record.streaks[habit.id] !== undefined}
        <li class="flex items-center gap-1 rounded-lg transition-colors hover:bg-slate/40">
          <button
            type="button"
            class="group flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pl-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-faint"
            aria-label={markLabel(habit)}
            onclick={() => markHabit(habit)}
          >
            <HabitMarkIcon {mark} />
            <span class="truncate text-sm {mark === 'missed' ? 'text-muted' : 'text-text'}">{habit.name}</span>
          </button>
          {#if editingStreak === habit.id}
            <input
              bind:this={streakInput}
              bind:value={streakDraft}
              class="mr-1 w-16 rounded-md border border-faint bg-ink px-2 py-1 text-right text-xs tabular-nums text-text focus:border-muted focus:outline-none"
              inputmode="numeric"
              pattern="[0-9]*"
              aria-label={fmt(t.tracker.streakInputLabel, { habit: habit.name })}
              onkeydown={onStreakKey}
              onblur={(e) => commitStreak(e.relatedTarget === null)}
            />
          {:else}
            <button
              type="button"
              class="shrink-0 rounded-md px-2 py-1.5 text-xs tabular-nums transition-colors hover:bg-slate hover:text-text
                {mark === 'done' ? 'text-text' : 'text-muted'}"
              aria-label={fmt(setByHand ? t.tracker.streakLabelByHand : t.tracker.streakLabel, {
                habit: habit.name,
                days: days(app.streakOn(habit.id, dayKey)),
              })}
              title={setByHand ? t.tracker.streakTitleByHand : t.tracker.streakTitleCounted}
              data-streak={habit.id}
              onclick={() => editStreak(habit)}
            >
              <span class={setByHand ? 'underline decoration-faint decoration-dotted underline-offset-[3px]' : ''}>
                {days(app.streakOn(habit.id, dayKey))}
              </span>
            </button>
          {/if}
        </li>
      {/each}
    </ul>
    {#if editingStreak}
      <p class="mt-1 text-[0.7rem] leading-snug text-muted">
        {t.tracker.streakHint}
      </p>
    {/if}
  {:else}
    <p class="mt-1.5 text-sm leading-snug text-muted">{t.tracker.habitsEmpty}</p>
  {/if}

  <form class="mt-2 flex items-center gap-2" onsubmit={add}>
    <input
      bind:value={newHabit}
      class="min-w-0 flex-1 rounded-lg border border-slate bg-ink/60 px-3 py-1.5 text-sm text-text placeholder:text-muted focus:border-faint focus:outline-none"
      placeholder={t.tracker.addHabitPlaceholder}
      aria-label={t.tracker.newHabit}
      maxlength="60"
    />
    {#if newHabit.trim()}
      <button
        type="submit"
        class="shrink-0 rounded-lg bg-text px-3 py-1.5 text-xs font-semibold text-ink transition-transform active:[transform:scale(0.97)]"
      >
        {t.common.add}
      </button>
    {/if}
  </form>
</section>
