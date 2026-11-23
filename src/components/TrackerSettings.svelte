<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { SCORE_SCALES, passMark } from '../lib/tracker';
  import type { Habit, UnmarkedDays } from '../lib/types';
  import { tooltip } from '../lib/tooltip';
  import { supportsHaptics } from '../lib/haptics';
  import { fmt, t } from '../lib/i18n/index.svelte';
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
  const hapticsSupported = supportsHaptics();
  const unmarkedOptions = $derived<{ value: UnmarkedDays; label: string }[]>([
    { value: 'pause', label: t.settings.unmarkedPause },
    { value: 'end', label: t.settings.unmarkedEnd },
  ]);
  const unmarkedHint = $derived(
    app.tracker.unmarkedDays === 'pause' ? t.settings.unmarkedPauseHint : t.settings.unmarkedEndHint,
  );

  const passMarkOptions = $derived(
    Array.from({ length: app.tracker.scoreScale - 1 }, (_, i) => ({
      value: i + 2,
      label: fmt(t.settings.passMarkOption, { score: i + 2 }),
    })),
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

<SettingsSection title={t.settings.scoreAndHabits}>
  <SettingsRow label={t.settings.scoreScale} hint={t.settings.scoreScaleHint}>
    <Segmented
      value={app.tracker.scoreScale}
      options={scaleOptions}
      onchange={(scale) => app.setScoreScale(scale)}
      label={t.settings.scoreScale}
    />
  </SettingsRow>
  {#if hapticsSupported}
    <SettingsRow label={t.settings.haptics} hint={t.settings.hapticsHint}>
      <Switch checked={app.trackerHaptics} label={t.settings.haptics} onchange={(on) => app.setTrackerHaptics(on)} />
    </SettingsRow>
  {/if}
  <SettingsRow label={t.settings.unmarkedDays} hint={unmarkedHint}>
    <Segmented
      value={app.tracker.unmarkedDays}
      options={unmarkedOptions}
      onchange={(rule) => app.setUnmarkedDays(rule)}
      label={t.settings.unmarkedDays}
    />
  </SettingsRow>
  <SettingsRow label={t.settings.passStreak} hint={t.settings.passStreakHint}>
    <Switch checked={app.tracker.passStreak} label={t.settings.passStreak} onchange={(on) => app.setPassStreak(on)} />
  </SettingsRow>
  <!-- Only matters while the streak is shown. -->
  {#if app.tracker.passStreak}
    <SettingsRow label={t.settings.passMark} hint={t.settings.passMarkHint}>
      <Select
        value={passMark(app.tracker)}
        options={passMarkOptions}
        onchange={(mark) => app.setPassMark(mark)}
        label={t.settings.passMark}
        listClass="min-w-28"
      />
    </SettingsRow>
  {/if}

  {#each active as habit (habit.id)}
    <div class="flex items-center gap-2 py-1.5 pr-2 pl-3.5">
      <input
        class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1.5 -ml-1.5 text-sm text-text hover:border-slate focus:border-faint focus:bg-ink/60 focus:outline-none"
        value={habit.name}
        aria-label={t.settings.habitName}
        maxlength="60"
        onchange={(e) => rename(habit, e.currentTarget)}
        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <button
        type="button"
        class={iconButton}
        aria-label={fmt(t.settings.archiveHabit, { name: habit.name })}
        use:tooltip={t.settings.archiveTooltip}
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
      placeholder={active.length ? t.settings.addHabitAnother : t.settings.addHabitFirst}
      aria-label={t.settings.newHabit}
      maxlength="60"
    />
    <button
      type="submit"
      class="shrink-0 rounded-lg border border-slate px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-50"
      disabled={!newHabit.trim()}
    >
      {t.common.add}
    </button>
  </form>

  {#each archived as habit (habit.id)}
    <div class="flex items-center gap-2 py-1.5 pr-2 pl-3.5">
      <span class="min-w-0 flex-1 truncate text-sm text-muted">{habit.name}</span>
      <span class="text-[0.7rem] text-muted">{t.settings.archived}</span>
      <button
        type="button"
        class="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text"
        onclick={() => app.setHabitArchived(habit.id, false)}
      >
        {t.common.restore}
      </button>
    </div>
  {/each}
</SettingsSection>
