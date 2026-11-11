<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { SCORE_SCALES, passMark } from '../lib/tracker';
  import type { Habit, UnmarkedDays } from '../lib/types';
  import { tooltip } from '../lib/tooltip';
  import Segmented from './Segmented.svelte';
  import Select from './Select.svelte';
  import Switch from './Switch.svelte';
  import SettingsRow from './SettingsRow.svelte';
  import SettingsSection from './SettingsSection.svelte';

  /**
   * How days are scored and streaks counted, and the habits themselves:
   * rename in place, archive (history is kept), bring back.
   */
  const scaleOptions = SCORE_SCALES.map((value) => ({ value, label: `1–${value}` }));
  const unmarkedOptions: { value: UnmarkedDays; label: string }[] = [
    { value: 'pause', label: 'Pause' },
    { value: 'end', label: 'End' },
  ];
  const unmarkedHint = $derived(
    app.tracker.unmarkedDays === 'pause'
      ? 'A day left unmarked keeps the streak as it was. Only a missed day ends it'
      : 'A day left unmarked ends the streak. Today counts once it is over'
  );

  const passMarkOptions = $derived(
    Array.from({ length: app.tracker.scoreScale - 1 }, (_, i) => ({ value: i + 2, label: `${i + 2} or more` })),
  );

  const active = $derived(app.tracker.habits.filter((h) => !h.archived));
  const archived = $derived(app.tracker.habits.filter((h) => h.archived));

  function rename(habit: Habit, input: HTMLInputElement) {
    if (input.value.trim()) app.renameHabit(habit.id, input.value);
    else input.value = habit.name;
  }

  let newHabit = $state('');
  function add(e: SubmitEvent) {
    e.preventDefault();
    app.addHabit(newHabit);
    newHabit = '';
  }

  const iconButton =
    'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text';
</script>

<SettingsSection title="Score and habits">
  <SettingsRow label="Score scale" hint="Scores already given keep their own scale">
    <Segmented
      value={app.tracker.scoreScale}
      options={scaleOptions}
      onchange={(scale) => app.setScoreScale(scale)}
      label="Score scale"
    />
  </SettingsRow>
  <SettingsRow label="Unmarked days" hint={unmarkedHint}>
    <Segmented
      value={app.tracker.unmarkedDays}
      options={unmarkedOptions}
      onchange={(rule) => app.setUnmarkedDays(rule)}
      label="Unmarked days"
    />
  </SettingsRow>
  <SettingsRow label="Pass streak" hint="Days in a row that passed (▲) or failed (▼), beside the day's score">
    <Switch checked={app.tracker.passStreak} label="Pass streak" onchange={(on) => app.setPassStreak(on)} />
  </SettingsRow>
  <!-- Only matters while the streak is shown. -->
  {#if app.tracker.passStreak}
    <SettingsRow label="Pass mark" hint="The lowest score that passes. Days without a score follow the unmarked days rule">
      <Select
        value={passMark(app.tracker)}
        options={passMarkOptions}
        onchange={(mark) => app.setPassMark(mark)}
        label="Pass mark"
        listClass="min-w-28"
      />
    </SettingsRow>
  {/if}

  {#each active as habit (habit.id)}
    <div class="flex items-center gap-2 py-1.5 pr-2 pl-3.5">
      <input
        class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1.5 -ml-1.5 text-sm text-text hover:border-slate focus:border-faint focus:bg-ink/60 focus:outline-none"
        value={habit.name}
        aria-label="Habit name"
        maxlength="60"
        onchange={(e) => rename(habit, e.currentTarget)}
        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <button
        type="button"
        class={iconButton}
        aria-label="Archive {habit.name}"
        use:tooltip={'Archive. Its history is kept'}
        onclick={() => app.setHabitArchived(habit.id, true)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>
      </button>
    </div>
  {/each}

  <form class="flex items-center gap-2 py-2 pr-2 pl-3.5" onsubmit={add}>
    <input
      bind:value={newHabit}
      class="min-w-0 flex-1 rounded-md border border-slate bg-ink/60 px-2.5 py-1.5 text-sm text-text placeholder:text-muted focus:border-faint focus:outline-none"
      placeholder={active.length ? 'Add another habit' : 'Add a habit to track every day'}
      aria-label="New habit"
      maxlength="60"
    />
    <button
      type="submit"
      class="shrink-0 rounded-lg border border-slate px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-50"
      disabled={!newHabit.trim()}
    >
      Add
    </button>
  </form>

  {#each archived as habit (habit.id)}
    <div class="flex items-center gap-2 py-1.5 pr-2 pl-3.5">
      <span class="min-w-0 flex-1 truncate text-sm text-muted">{habit.name}</span>
      <span class="text-[0.7rem] text-muted">Archived</span>
      <button
        type="button"
        class="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text"
        onclick={() => app.setHabitArchived(habit.id, false)}
      >
        Restore
      </button>
    </div>
  {/each}
</SettingsSection>
