<script lang="ts">
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { clickOutside, portal, trapFocus } from '../lib/actions';
  import { tooltip } from '../lib/tooltip';
  import { app } from '../lib/store.svelte';
  import { viewport } from '../lib/viewport.svelte';
  import { compactDayLabel, keyToDate } from '../lib/date';
  import { activeHabits, dayRecord } from '../lib/tracker';
  import { isBestScore, sunColor } from '../lib/sun';
  import Modal from './Modal.svelte';
  import DayTrackerPanel from './DayTrackerPanel.svelte';
  import HabitMarkIcon from './HabitMarkIcon.svelte';

  /**
   * The day's score and habits, at a glance, in the day's header: a small sun
   * with the score, a triangle with the days in a row it passed (▲) or failed
   * (▼), and one dot per habit. It opens the day's tracking, as a
   * popover beside it or, on phones, a bottom sheet. In the editor's header
   * (`writing`) it stays smaller: no label, and R types an R.
   */
  let {
    dayKey,
    open = $bindable(false),
    writing = false,
  }: { dayKey: string; open?: boolean; writing?: boolean } = $props();

  const record = $derived(dayRecord(app.tracker, dayKey));
  const habits = $derived(activeHabits(app.tracker));
  const score = $derived(record.score);
  const done = $derived(habits.filter((h) => record.marks[h.id] === 'done').length);
  // Past a handful, dots stop being readable at a glance: count instead.
  const MAX_DOTS = 8;
  // A run of one day says nothing the score doesn't.
  const run = $derived.by(() => {
    const found = app.passRun(dayKey);
    return found && found.length > 1 ? found : null;
  });
  const runLabel = $derived(run ? `${run.passed ? 'Passed' : 'Failed'} ${run.length} days in a row` : '');
  // The sun's colour for the score, or every colour for the best one.
  const best = $derived(score !== undefined && isBestScore(score));
  const sunTint = $derived(score && !best ? sunColor(score) : undefined);

  const summary = $derived(
    [
      score ? `Score ${score.value} of ${score.scale}` : 'Not scored',
      runLabel,
      habits.length ? `${done} of ${habits.length} habits done` : '',
    ]
      .filter(Boolean)
      .join(', '),
  );

  // Where the popover starts on screen, so it can stop short of the bottom
  // edge and scroll a long list of habits instead.
  let trigger = $state<HTMLElement | null>(null);
  let popoverTop = $state(0);
  $effect(() => {
    if (open && trigger) popoverTop = trigger.getBoundingClientRect().bottom + 8;
  });

  function manageHabits() {
    open = false;
    app.settingsOpen = true;
  }
</script>

<div class="relative" use:clickOutside={() => !viewport.compact && (open = false)}>
  <button
    type="button"
    class="-mx-1.5 -my-1 flex items-center gap-2 rounded-md px-1.5 py-1 text-[0.7rem] font-medium text-muted transition-colors hover:bg-slate hover:text-text
      {open ? 'bg-slate text-text' : ''}"
    aria-label="{summary}. Score and habits"
    aria-haspopup="dialog"
    aria-expanded={open}
    use:tooltip={{
      label: runLabel ? `Score and habits · ${runLabel}` : 'Score and habits',
      keys: writing ? undefined : ['R'],
    }}
    onclick={() => (open = !open)}
    bind:this={trigger}
    data-testid="day-tracker"
  >
    <span class="flex items-center gap-1 tabular-nums">
      <svg
        class={best ? 'rainbow-text' : ''}
        style:color={sunTint}
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.5" fill={score ? 'currentColor' : 'none'} />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </svg>
      {#if score}
        <span class={score.scale === app.tracker.scoreScale ? 'text-text' : ''}>
          {score.scale === app.tracker.scoreScale ? score.value : `${score.value}/${score.scale}`}
        </span>
      {:else if !habits.length && !writing}
        <span>Score the day</span>
      {/if}
    </span>
    {#if run}
      <span
        class="flex items-center gap-0.5 tabular-nums {best ? 'rainbow-text' : ''}"
        style:color={sunTint}
        data-testid="pass-run"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={run.passed ? 'M12 4 22 19H2z' : 'M12 20 2 5h20z'} />
        </svg>
        {run.length}
      </span>
    {/if}
    {#if habits.length > MAX_DOTS}
      <span class="tabular-nums">{done}/{habits.length}</span>
    {:else if habits.length}
      <span class="flex items-center gap-[3px]">
        {#each habits as habit (habit.id)}
          <HabitMarkIcon mark={record.marks[habit.id]} dot />
        {/each}
      </span>
    {/if}
  </button>

  {#if open}
    {#if viewport.compact}
      <div use:portal>
        <Modal title={compactDayLabel(keyToDate(dayKey), app.dateFormat)} onclose={() => (open = false)} z="z-sheet">
          <DayTrackerPanel {dayKey} onmanage={manageHabits} />
        </Modal>
      </div>
    {:else}
      <div
        class="absolute top-full left-0 z-popover mt-2 max-h-[calc(var(--screen-h)-var(--tracker-top,9rem)-1rem)] w-[19.5rem] origin-top-left overflow-y-auto overscroll-contain rounded-2xl border border-slate bg-surface p-4 shadow-2xl shadow-black/50"
        style:--tracker-top="{popoverTop}px"
        transition:scale={{ duration: viewport.reducedMotion ? 0 : 160, start: 0.96, easing: cubicOut }}
        use:trapFocus={() => (open = false)}
        role="dialog"
        aria-label="Score and habits"
      >
        <DayTrackerPanel {dayKey} onmanage={manageHabits} />
      </div>
    {/if}
  {/if}
</div>
