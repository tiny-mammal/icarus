<script lang="ts">
  import { tick } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { scale } from 'svelte/transition';
  import { app } from '../lib/store.svelte';
  import { clickOutside } from '../lib/actions';
  import Modal from './Modal.svelte';
  import { shortDayLabel } from '../lib/date';
  import {
    STATS_PERIODS,
    computeStats,
    type DayStat,
    type StatsPeriod,
  } from '../lib/stats';
  import {
    barsPath,
    compactNumber,
    monotoneLinePath,
    niceCeil,
    placeTooltip,
    type ChartPoint,
  } from '../lib/chart';
  import type { BinUnit } from '../lib/timeline';

  const numberFmt = new Intl.NumberFormat();

  // --- period selector ----------------------------------------------------
  let period = $state<StatsPeriod>('all');
  const stats = $derived(computeStats(app.entries, period, new Date(), app.dateFormat));
  const periodLabel = $derived(
    STATS_PERIODS.find((p) => p.value === period)?.label ?? '',
  );

  let selectOpen = $state(false);
  let selectIdx = $state(0);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);

  function openPeriodSelect() {
    selectIdx = Math.max(
      0,
      STATS_PERIODS.findIndex((p) => p.value === period),
    );
    selectOpen = true;
    focusOption();
  }

  function focusOption() {
    void tick().then(() => {
      listEl?.querySelectorAll<HTMLElement>('[role="option"]')[selectIdx]?.focus();
    });
  }

  function choosePeriod(value: StatsPeriod) {
    period = value;
    selectOpen = false;
    triggerEl?.focus();
  }

  function onSelectKey(e: KeyboardEvent) {
    if (!selectOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPeriodSelect();
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      selectIdx = (selectIdx + delta + STATS_PERIODS.length) % STATS_PERIODS.length;
      focusOption();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choosePeriod(STATS_PERIODS[selectIdx].value);
    } else if (e.key === 'Escape') {
      // Close only the list — the modal's own Escape handler must not fire.
      e.preventDefault();
      e.stopPropagation();
      selectOpen = false;
      triggerEl?.focus();
    }
  }

  // --- chart geometry -----------------------------------------------------
  const CHART_HEIGHT = 190;
  const PAD = { top: 14, right: 10, bottom: 6, left: 40 } as const;
  const PLOT_HEIGHT = CHART_HEIGHT - PAD.top - PAD.bottom;
  const BASELINE = PAD.top + PLOT_HEIGHT;

  const BAR_NOUN: Record<BinUnit, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

  let chartWidth = $state(0);
  let hoverIndex = $state<number | null>(null);

  const timeline = $derived(stats.timeline);
  const bins = $derived(timeline.bins);
  const yMax = $derived(
    niceCeil(bins.reduce((max, bin) => Math.max(max, bin.perDay, bin.average), 0)),
  );
  const plotWidth = $derived(Math.max(0, chartWidth - PAD.left - PAD.right));
  // Each bin owns an equal band; its bar fills the band (minus a hairline gap
  // when bands are wide enough) and its average sits at the band's centre.
  const bandWidth = $derived(bins.length > 0 ? plotWidth / bins.length : 0);
  const barGap = $derived(bandWidth >= 4 ? 1 : 0);

  function yOf(value: number): number {
    return BASELINE - (yMax > 0 ? (value / yMax) * PLOT_HEIGHT : 0);
  }

  const bars = $derived(
    bins.map((bin, i) => ({
      x: PAD.left + i * bandWidth + barGap / 2,
      width: bandWidth - barGap,
      top: yOf(bin.perDay),
    })),
  );
  const barPath = $derived(barsPath(bars, BASELINE));
  const averagePoints = $derived<ChartPoint[]>(
    bins.map((bin, i) => ({
      x: PAD.left + (i + 0.5) * bandWidth,
      y: yOf(bin.average),
    })),
  );
  const averagePath = $derived(monotoneLinePath(averagePoints));

  const yTicks = $derived(
    yMax > 0
      ? [0, yMax / 2, yMax].map((value) => ({
          value,
          y: yOf(value),
          label: compactNumber(value),
        }))
      : [{ value: 0, y: BASELINE, label: '0' }],
  );

  // Labels sit under their bin; ones near an edge are anchored inward so they
  // never overflow the chart.
  const xTicks = $derived(
    chartWidth > 0
      ? timeline.ticks.map((tick) => {
          const x = PAD.left + (tick.index + 0.5) * bandWidth;
          return {
            ...tick,
            x,
            anchor: x < PAD.left + 24 ? 'start' : x > chartWidth - 24 ? 'end' : 'center',
          };
        })
      : [],
  );

  const hoverBin = $derived(hoverIndex === null ? null : (bins[hoverIndex] ?? null));
  const hoverBar = $derived(hoverIndex === null ? null : (bars[hoverIndex] ?? null));
  const hoverPoint = $derived(
    hoverIndex === null ? null : (averagePoints[hoverIndex] ?? null),
  );

  // The tooltip may rise over the chart heading so it can sit above most
  // points instead of covering them. It clears both the bar and the line.
  const TOOLTIP_HEADROOM = 28;
  let tooltipWidth = $state(0);
  let tooltipHeight = $state(0);
  const tooltipBox = $derived(
    hoverPoint && hoverBar
      ? placeTooltip(
          { x: hoverPoint.x, y: Math.min(hoverPoint.y, hoverBar.top) },
          { width: tooltipWidth, height: tooltipHeight },
          { top: -TOOLTIP_HEADROOM, width: chartWidth, height: CHART_HEIGHT },
        )
      : null,
  );

  function onChartMove(e: PointerEvent) {
    if (bins.length === 0 || bandWidth <= 0) return;
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const index = Math.floor((e.clientX - bounds.left - PAD.left) / bandWidth);
    hoverIndex = Math.min(Math.max(index, 0), bins.length - 1);
  }

  function barWidth(day: DayStat): number {
    const top = stats.ranking[0]?.chars ?? 0;
    if (top <= 0 || day.chars <= 0) return 0;
    return Math.max(2, (day.chars / top) * 100);
  }

  function openDay(day: DayStat) {
    app.openDay(day.key);
    app.statsOpen = false;
  }
</script>

{#if app.statsOpen}
  <Modal
    title="Statistics"
    onclose={() => (app.statsOpen = false)}
    width="sm:max-w-2xl"
    z="z-sheet"
    divided
  >
    {#snippet actions()}
      <div
        class="relative"
        use:clickOutside={() => (selectOpen = false)}
        onfocusout={(e) => {
          // Tabbing out of the picker should dismiss it, but moving focus
          // between its own trigger and options must not.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) selectOpen = false;
        }}
      >
        <button
          bind:this={triggerEl}
          type="button"
          class="flex items-center gap-1.5 rounded-lg border border-slate px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text
            {selectOpen ? 'border-faint text-text' : ''}"
          onclick={() => (selectOpen ? (selectOpen = false) : openPeriodSelect())}
          onkeydown={onSelectKey}
          aria-haspopup="listbox"
          aria-expanded={selectOpen}
        >
          <span>{periodLabel}</span>
          <svg
            class="transition-transform {selectOpen ? 'rotate-180' : ''}"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {#if selectOpen}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            bind:this={listEl}
            class="absolute top-full right-0 z-popover mt-2 w-44 origin-top-right rounded-xl border border-slate bg-surface p-1 shadow-2xl shadow-black/50"
            transition:scale={{ duration: 140, start: 0.96, easing: cubicOut }}
            role="listbox"
            aria-label="Statistics period"
            tabindex="-1"
            onkeydown={onSelectKey}
          >
            {#each STATS_PERIODS as option, i (option.value)}
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors sm:py-1.5 sm:text-xs
                  {i === selectIdx ? 'bg-slate text-text' : 'text-muted hover:bg-slate-soft hover:text-text'}"
                role="option"
                aria-selected={option.value === period}
                tabindex="-1"
                onclick={() => choosePeriod(option.value)}
              >
                <span>{option.label}</span>
                {#if option.value === period}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/snippet}

    <!-- Headline totals -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-slate bg-slate-soft px-3.5 py-3">
        <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">
          Entries
        </p>
        <p class="mt-1 text-lg font-semibold tabular-nums tracking-tight text-text">
          {numberFmt.format(stats.totalEntries)}
        </p>
        <p class="mt-0.5 truncate text-[0.7rem] text-muted">{periodLabel}</p>
      </div>
      <div class="rounded-xl border border-slate bg-slate-soft px-3.5 py-3">
        <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">
          Characters
        </p>
        <p class="mt-1 text-lg font-semibold tabular-nums tracking-tight text-text">
          {numberFmt.format(stats.totalChars)}
        </p>
        <p class="mt-0.5 truncate text-[0.7rem] text-muted">{periodLabel}</p>
      </div>
      <div class="rounded-xl border border-slate bg-slate-soft px-3.5 py-3">
        <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">
          Avg. entry
        </p>
        <p class="mt-1 text-lg font-semibold tabular-nums tracking-tight text-text">
          {stats.totalEntries > 0 ? numberFmt.format(Math.round(stats.averageChars)) : '—'}
        </p>
        <p class="mt-0.5 truncate text-[0.7rem] text-muted">Characters per entry</p>
      </div>
      <div class="rounded-xl border border-slate bg-slate-soft px-3.5 py-3">
        <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">
          Best day
        </p>
        <p class="mt-1 truncate text-sm font-semibold tracking-tight text-text">
          {stats.bestDay ? shortDayLabel(stats.bestDay.date, app.dateFormat) : '—'}
        </p>
        <p class="mt-0.5 truncate text-[0.7rem] text-muted">
          {stats.bestDay
            ? `${numberFmt.format(stats.bestDay.chars)} characters`
            : periodLabel}
        </p>
      </div>
    </div>

    <!-- Evolution chart -->
    <div class="mt-6">
      <div class="mb-3 flex items-end justify-between gap-4">
        <h3 class="text-sm font-medium text-text">Characters per day</h3>
        <p class="text-[0.7rem] text-muted">{periodLabel}</p>
      </div>

      {#if bins.length > 0 && stats.totalChars > 0}
        <div class="relative" bind:clientWidth={chartWidth}>
          <svg
            width={chartWidth}
            height={CHART_HEIGHT}
            class="block [touch-action:pan-y]"
            onpointermove={onChartMove}
            onpointerdown={onChartMove}
            onpointerleave={() => (hoverIndex = null)}
            role="img"
            aria-label="Characters written over the selected period"
          >
            {#each yTicks as tick}
              <line
                x1={PAD.left}
                x2={Math.max(PAD.left, chartWidth - PAD.right)}
                y1={tick.y}
                y2={tick.y}
                stroke={tick.value === 0 ? 'var(--color-faint)' : 'var(--color-slate)'}
                stroke-width="1"
                stroke-dasharray={tick.value === 0 ? undefined : '2 6'}
              />
            {/each}

            <path d={barPath} fill="var(--color-text)" opacity="0.16" />

            {#if hoverBar && hoverPoint}
              <line
                x1={hoverPoint.x}
                x2={hoverPoint.x}
                y1={PAD.top}
                y2={BASELINE}
                stroke="var(--color-faint)"
                stroke-width="1"
              />
              <path
                d={barsPath([{ ...hoverBar, width: Math.max(hoverBar.width, 2) }], BASELINE)}
                fill="var(--color-text)"
                opacity="0.5"
              />
            {/if}

            {#if bins.length === 1}
              <circle cx={averagePoints[0].x} cy={averagePoints[0].y} r="3.5" fill="var(--color-text)" />
            {:else}
              <path
                d={averagePath}
                fill="none"
                stroke="var(--color-text)"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            {/if}

            {#if hoverPoint}
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r="4"
                fill="var(--color-ink)"
                stroke="var(--color-text)"
                stroke-width="2"
              />
            {/if}
          </svg>

          <!-- y-axis labels live in HTML so they stay crisp when the chart scales -->
          {#each yTicks as tick}
            <span
              class="absolute w-8 text-right text-[0.6rem] tabular-nums text-muted"
              style:left="2px"
              style:top="{tick.y - 7}px"
            >
              {tick.label}
            </span>
          {/each}

          {#if hoverBin && tooltipBox}
            <div
              class="pointer-events-none absolute z-tooltip rounded-lg border border-slate bg-surface/95 px-2.5 py-1.5 shadow-lg shadow-black/40 backdrop-blur-sm"
              style:left="{tooltipBox.left}px"
              style:top="{tooltipBox.top}px"
              bind:offsetWidth={tooltipWidth}
              bind:offsetHeight={tooltipHeight}
            >
              <p class="text-[0.65rem] font-medium whitespace-nowrap text-muted">
                {hoverBin.fullLabel}
              </p>
              <p class="text-xs whitespace-nowrap text-text">
                {numberFmt.format(hoverBin.chars)}
                <span class="text-muted">
                  characters · {hoverBin.entries}
                  {hoverBin.entries === 1 ? 'entry' : 'entries'}
                </span>
              </p>
              <p class="text-[0.65rem] whitespace-nowrap text-muted">
                {numberFmt.format(Math.round(hoverBin.average))} per day,
                {timeline.averageDays}-day average
              </p>
            </div>
          {/if}

          <div class="relative mt-1.5 h-4">
            {#each xTicks as tick (tick.index)}
              <span
                class="absolute top-0 text-[0.6rem] whitespace-nowrap text-muted
                  {tick.anchor === 'center'
                    ? '[transform:translateX(-50%)]'
                    : tick.anchor === 'end'
                      ? '[transform:translateX(-100%)]'
                      : ''}"
                style:left="{tick.x}px"
              >
                {tick.label}
              </span>
            {/each}
          </div>

          <div class="mt-2 flex items-center justify-end gap-4 text-[0.65rem] text-muted">
            <span class="flex items-center gap-1.5">
              <span class="inline-block h-2.5 w-1.5 rounded-[1px] bg-text/30"></span>
              {BAR_NOUN[timeline.unit]}{timeline.unit === 'day' ? '' : ' (per day)'}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block h-[2px] w-3 rounded-full bg-text"></span>
              {timeline.averageDays}-day average
            </span>
          </div>
        </div>
      {:else}
        <div
          class="grid h-48 place-items-center rounded-xl border border-dashed border-slate px-4 text-center text-sm text-muted"
        >
          {stats.totalEntries === 0
            ? 'No entries in this period.'
            : 'Nothing written in this period.'}
        </div>
      {/if}
    </div>

    <!-- Top days -->
    <div class="mt-6">
      <div class="mb-2 flex items-end justify-between gap-4">
        <h3 class="text-sm font-medium text-text">Top days</h3>
        <p class="text-[0.7rem] text-muted">By characters written</p>
      </div>
      {#if stats.ranking.length > 0}
        <ol class="space-y-0.5">
          {#each stats.ranking as day, i (day.key)}
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-soft"
                title="Open this day"
                onclick={() => openDay(day)}
              >
                <span class="w-5 shrink-0 font-mono text-xs tabular-nums text-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-baseline justify-between gap-3">
                    <span class="truncate text-sm text-text">{shortDayLabel(day.date, app.dateFormat)}</span>
                    <span class="shrink-0 text-xs tabular-nums text-muted">
                      {numberFmt.format(day.chars)}
                    </span>
                  </span>
                  <span class="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate">
                    <span
                      class="block h-full rounded-full bg-muted"
                      style:width="{barWidth(day)}%"
                    ></span>
                  </span>
                </span>
              </button>
            </li>
          {/each}
        </ol>
      {:else}
        <p
          class="rounded-xl border border-dashed border-slate px-4 py-6 text-center text-sm text-muted"
        >
          No entries in this period.
        </p>
      {/if}
    </div>
  </Modal>
{/if}
