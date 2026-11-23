<script lang="ts">
  import { tooltip, type TooltipContent } from '../lib/tooltip';
  import { app } from '../lib/store.svelte';
  import { compactDayLabel, keyToDate, longDayLabel, shortDayLabel } from '../lib/date';
  import { fmt, t } from '../lib/i18n/index.svelte';

  // The open day's label flanked by arrows that jump to the previous/next day
  // with entries.
  let { date }: { date: Date } = $props();

  function hint(dir: 'previous' | 'next', key: string | null): TooltipContent {
    if (!key) return { label: dir === 'previous' ? t.nav.noEarlierEntries : t.nav.noLaterEntries };
    return {
      label: fmt(dir === 'previous' ? t.nav.previousDayHint : t.nav.nextDayHint, {
        day: shortDayLabel(keyToDate(key), app.dateFormat),
      }),
      keys: ['Shift', dir === 'previous' ? '←' : '→'],
    };
  }
</script>

<div class="flex min-w-0 items-center gap-1">
  <button
    class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text disabled:pointer-events-none disabled:opacity-30"
    aria-label={t.nav.previousDay}
    use:tooltip={hint('previous', app.prevDayKey)}
    disabled={!app.prevDayKey}
    onclick={() => app.stepDay(-1)}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  </button>
  <h2
    class="truncate text-base font-semibold tracking-tight text-text tabular-nums"
  >
    <!-- Narrow screens get the short form so the header's actions fit. -->
    <span class="sm:hidden">{compactDayLabel(date, app.dateFormat)}</span>
    <span class="hidden sm:inline">{longDayLabel(date, app.dateFormat)}</span>
  </h2>
  <button
    class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text disabled:pointer-events-none disabled:opacity-30"
    aria-label={t.nav.nextDay}
    use:tooltip={hint('next', app.nextDayKey)}
    disabled={!app.nextDayKey}
    onclick={() => app.stepDay(1)}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </button>
</div>
