<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { dateKey } from '../lib/date';
  import {
    STATS_PRESETS,
    isCustomRange,
    periodLabel,
    periodRange,
    type StatsPeriod,
    type StatsPreset,
  } from '../lib/stats';
  import DateRangePicker from './DateRangePicker.svelte';
  import Select from './Select.svelte';

  /**
   * The statistics period: a select of presets whose last option, "Custom
   * range…", turns the same popover into a range calendar.
   */
  let { period = $bindable() }: { period: StatsPeriod } = $props();

  const CUSTOM = 'custom';
  const current = $derived(isCustomRange(period) ? CUSTOM : period);
  const label = $derived(periodLabel(period, app.dateFormat));
  const options = $derived([
    ...STATS_PRESETS,
    {
      value: CUSTOM,
      label: 'Custom range…',
      hint: current === CUSTOM ? label : undefined,
      separated: true,
    } as const,
  ]);
</script>

<Select
  value={current}
  {options}
  onchange={(value) => (period = value as StatsPreset)}
  label="Statistics period"
  display={label}
  panelValue={CUSTOM}
  panelLabel="Custom range"
  triggerClass="max-w-[11.5rem] sm:max-w-none"
  listClass="w-48"
  panelClass="w-[min(19.5rem,calc(100vw-4.5rem))] p-3"
>
  {#snippet leading()}
    {#if current === CUSTOM}
      <svg class="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    {/if}
  {/snippet}
  {#snippet panel({ close, back })}
    <!-- The calendar opens on the period on show: a preset is a starting point to adjust. -->
    <DateRangePicker
      initial={periodRange(period, app.entries)}
      onapply={(range) => {
        period = { start: dateKey(range.start), end: dateKey(range.end) };
        close();
      }}
      oncancel={back}
    />
  {/snippet}
</Select>
