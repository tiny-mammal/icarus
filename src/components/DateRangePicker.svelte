<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '../lib/store.svelte';
  import { compactDayLabel, dateKey, daysBetween, startOfMonth } from '../lib/date';
  import MiniCalendar from './MiniCalendar.svelte';
  import { fmt, t } from '../lib/i18n/index.svelte';

  /**
   * Pick an inclusive range of days. The From and To fields show which end the
   * next tap sets. A tap starts a new range and the next one ends it, with the
   * pointer previewing the end in between; tapping a field first moves just
   * that end and keeps the other.
   */
  let {
    initial,
    onapply,
    oncancel,
  }: {
    /** Range to start from, e.g. the period currently shown. */
    initial: { start: Date; end: Date } | null;
    onapply: (range: { start: Date; end: Date }) => void;
    oncancel: () => void;
  } = $props();

  type End = 'start' | 'end';

  // `initial` only seeds the picker; later changes to it are ignored.
  const seed = untrack(() => initial);
  let start = $state<Date | null>(seed?.start ?? null);
  let end = $state<Date | null>(seed?.end ?? null);
  let active = $state<End>('start');
  // The user chose the end to move (by its field) rather than starting over.
  let adjusting = $state(false);
  let hover = $state<Date | null>(null);
  let month = $state(startOfMonth(seed?.end ?? new Date()));

  // While only the start is set, the hovered day stands in for the end.
  const shown = $derived.by(() => {
    if (start && !end && hover) {
      return hover < start
        ? { start: hover, end: start, tentative: true }
        : { start, end: hover, tentative: true };
    }
    return { start, end, tentative: false };
  });

  function pick(day: Date) {
    if (active === 'start' || !start || day < start) {
      // Moving only the start keeps the end, unless it would come first.
      const keepEnd = adjusting && active === 'start' && end && day <= end;
      start = day;
      if (!keepEnd) end = null;
      active = keepEnd ? 'start' : 'end';
      adjusting = Boolean(keepEnd);
    } else {
      end = day;
      active = 'start';
      adjusting = false;
    }
  }

  function focusEnd(which: End) {
    active = which;
    adjusting = true;
    const day = which === 'start' ? start : end;
    if (day) month = startOfMonth(day);
  }

  const days = $derived(start && end ? daysBetween(start, end) + 1 : 0);
  const writtenDays = $derived.by(() => {
    if (!start || !end) return 0;
    const from = dateKey(start);
    const to = dateKey(end);
    return app.dayKeys.filter((key) => key >= from && key <= to).length;
  });
</script>

<div class="flex flex-col">
  <div class="mb-3 grid grid-cols-2 gap-1.5" role="group" aria-label={t.nav.rangeEnds}>
    {#each [{ which: 'start', label: t.nav.rangeFrom, day: start }, { which: 'end', label: t.nav.rangeTo, day: end }] as field (field.which)}
      {@const on = active === field.which}
      <button
        type="button"
        class="flex min-w-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors
          {on ? 'border-faint bg-slate-soft' : 'border-slate hover:bg-slate-soft'}"
        aria-pressed={on}
        onclick={() => focusEnd(field.which as End)}
      >
        <span class="text-[0.65rem] font-medium {on ? 'text-text' : 'text-muted'}">{field.label}</span>
        <span class="mt-0.5 w-full truncate text-xs tabular-nums {field.day ? 'text-text' : 'text-muted'}">
          {field.day ? compactDayLabel(field.day, app.dateFormat) : t.nav.pickDay}
        </span>
      </button>
    {/each}
  </div>

  <MiniCalendar
    bind:month
    start={shown.start}
    end={shown.end}
    tentative={shown.tentative}
    onpick={pick}
    onhover={(day) => (hover = day)}
  />

  <div class="mt-3 flex items-center justify-between gap-3 border-t border-slate pt-3">
    <p class="min-w-0 text-[0.7rem] leading-tight text-muted" aria-live="polite">
      {#if days > 0}
        <span class="text-text tabular-nums">{fmt(t.common.days, { count: days })}</span><br />
        {writtenDays === 0
          ? t.nav.rangeNothingWritten
          : fmt(t.nav.rangeDaysWithEntries, { count: writtenDays })}
      {:else}
        {active === 'start' ? t.nav.pickFirstDay : t.nav.pickLastDay}
      {/if}
    </p>
    <div class="flex shrink-0 items-center gap-1">
      <button
        type="button"
        class="rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text sm:py-1.5"
        onclick={oncancel}
      >
        {t.common.cancel}
      </button>
      <button
        type="button"
        class="rounded-lg bg-text px-3 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 sm:py-1.5"
        disabled={!start || !end}
        onclick={() => start && end && onapply({ start, end })}
      >
        {t.nav.apply}
      </button>
    </div>
  </div>
</div>
