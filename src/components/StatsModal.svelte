<script lang="ts">
  import { tick } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade, scale } from 'svelte/transition';
  import { app } from '../lib/store.svelte';
  import { clickOutside, trapFocus } from '../lib/actions';
  import { shortDayLabel } from '../lib/date';
  import {
    STATS_PERIODS,
    computeStats,
    type DayStat,
    type StatsPeriod,
  } from '../lib/stats';
  import {
    compactNumber,
    monotoneAreaPath,
    monotoneLinePath,
    niceCeil,
    type ChartPoint,
  } from '../lib/chart';

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

  let chartWidth = $state(0);
  let hoverIndex = $state<number | null>(null);

  const maxChars = $derived(
    stats.buckets.reduce((max, bucket) => Math.max(max, bucket.chars), 0),
  );
  const yMax = $derived(niceCeil(maxChars));
  const plotWidth = $derived(Math.max(0, chartWidth - PAD.left - PAD.right));
  // Points span the plot edge to edge, so the first and last bucket sit right
  // on the axis instead of leaving half a band of dead space at each side.
  const stepX = $derived(
    stats.buckets.length > 1
      ? plotWidth / (stats.buckets.length - 1)
      : 0,
  );
  const points = $derived<ChartPoint[]>(
    stats.buckets.map((bucket, i) => ({
      x:
        stats.buckets.length === 1
          ? PAD.left + plotWidth / 2
          : PAD.left + i * stepX,
      y:
        PAD.top +
        PLOT_HEIGHT -
        (yMax > 0 ? (bucket.chars / yMax) * PLOT_HEIGHT : 0),
    })),
  );
  const linePath = $derived(monotoneLinePath(points));
  const areaPath = $derived(monotoneAreaPath(points, PAD.top + PLOT_HEIGHT));

  const yTicks = $derived(
    yMax > 0
      ? [0, yMax / 2, yMax].map((value) => ({
          value,
          y: PAD.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT,
          label: compactNumber(value),
        }))
      : [{ value: 0, y: PAD.top + PLOT_HEIGHT, label: '0' }],
  );

  // Thin the x-axis labels out so 30 daily or 40 yearly points stay legible.
  // Ticks are spread evenly (always including the first and last bucket) so the
  // final label can never collide with its neighbour.
  const MAX_X_TICKS = 6;
  const xTicks = $derived.by(() => {
    const count = stats.buckets.length;
    if (count === 0 || chartWidth <= 0) return [];
    const indices = new Set<number>();
    if (count <= 12) {
      for (let i = 0; i < count; i++) indices.add(i);
    } else {
      for (let t = 0; t < MAX_X_TICKS; t++) {
        indices.add(Math.round((t * (count - 1)) / (MAX_X_TICKS - 1)));
      }
    }
    return [...indices].map((i) => ({
      i,
      label: stats.buckets[i].label,
      x: points[i].x,
      // Anchor the outermost labels inward so they never overflow the chart.
      anchor:
        count === 1 ? 'center' : i === 0 ? 'start' : i === count - 1 ? 'end' : 'center',
    }));
  });

  // Highlighted strip around the hovered point, bounded by its neighbours.
  const hoverBand = $derived.by(() => {
    const count = stats.buckets.length;
    if (hoverIndex === null || count === 0) return null;
    if (count === 1) return { x: PAD.left, width: plotWidth };
    const left = PAD.left + (hoverIndex - 0.5) * stepX;
    const right = PAD.left + (hoverIndex + 0.5) * stepX;
    const x = Math.max(PAD.left, left);
    return { x, width: Math.min(PAD.left + plotWidth, right) - x };
  });

  const hoverBucket = $derived(
    hoverIndex === null ? null : (stats.buckets[hoverIndex] ?? null),
  );
  const hoverPoint = $derived(
    hoverIndex === null ? null : (points[hoverIndex] ?? null),
  );
  const tooltipLeft = $derived(
    hoverPoint
      ? Math.min(Math.max(hoverPoint.x, 80), Math.max(chartWidth - 80, 80))
      : 0,
  );

  function onChartMove(e: PointerEvent) {
    const count = stats.buckets.length;
    if (count === 0 || plotWidth <= 0) return;
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = e.clientX - bounds.left - PAD.left;
    const index = count === 1 ? 0 : Math.round(offset / stepX);
    hoverIndex = Math.min(Math.max(index, 0), count - 1);
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
  <div
    class="absolute inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm"
    transition:fade={{ duration: 160 }}
    onclick={() => (app.statsOpen = false)}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="flex max-h-[min(46rem,92vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate bg-surface shadow-2xl shadow-black/50"
      transition:scale={{ duration: 200, start: 0.96, easing: cubicOut }}
      onclick={(e) => e.stopPropagation()}
      use:trapFocus={() => (app.statsOpen = false)}
      role="dialog"
      aria-modal="true"
      aria-label="Statistics"
      tabindex="-1"
    >
      <!-- Header with the period picker (and the only way out, besides Esc). -->
      <header
        class="relative z-20 flex shrink-0 items-center justify-between gap-4 border-b border-slate px-6 py-4"
      >
        <h2 class="text-base font-semibold tracking-tight text-text">Statistics</h2>
        <div class="flex items-center gap-2">
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
                class="absolute top-full right-0 z-30 mt-2 w-44 origin-top-right rounded-xl border border-slate bg-surface p-1 shadow-2xl shadow-black/50"
                transition:scale={{ duration: 140, start: 0.96, easing: cubicOut }}
                role="listbox"
                aria-label="Statistics period"
                tabindex="-1"
                onkeydown={onSelectKey}
              >
                {#each STATS_PERIODS as option, i (option.value)}
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors
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

          <button
            class="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
            aria-label="Close"
            onclick={() => (app.statsOpen = false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <!-- Headline totals -->
        <div class="grid gap-3 sm:grid-cols-3">
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
            <h3 class="text-sm font-medium text-text">Characters over time</h3>
            <p class="text-[0.7rem] text-muted">{periodLabel}</p>
          </div>

          {#if stats.buckets.length > 0 && stats.totalChars > 0}
            <div class="relative" bind:clientWidth={chartWidth}>
              <svg
                width={chartWidth}
                height={CHART_HEIGHT}
                class="block touch-none"
                onpointermove={onChartMove}
                onpointerdown={onChartMove}
                onpointerleave={() => (hoverIndex = null)}
                role="img"
                aria-label="Characters written over the selected period"
              >
                <defs>
                  <linearGradient id="stats-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-text)" stop-opacity="0.22" />
                    <stop offset="100%" stop-color="var(--color-text)" stop-opacity="0" />
                  </linearGradient>
                </defs>

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

                {#if hoverBand && hoverPoint}
                  <rect
                    x={hoverBand.x}
                    y={PAD.top}
                    width={hoverBand.width}
                    height={PLOT_HEIGHT}
                    rx="4"
                    fill="var(--color-text)"
                    opacity="0.045"
                  />
                  <line
                    x1={hoverPoint.x}
                    x2={hoverPoint.x}
                    y1={PAD.top}
                    y2={PAD.top + PLOT_HEIGHT}
                    stroke="var(--color-faint)"
                    stroke-width="1"
                  />
                {/if}

                <path d={areaPath} fill="url(#stats-area-fill)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--color-text)"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                {#if points.length === 1}
                  <circle cx={points[0].x} cy={points[0].y} r="3.5" fill="var(--color-text)" />
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

              {#if hoverBucket && hoverPoint}
                <div
                  class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-slate bg-surface/95 px-2.5 py-1.5 shadow-lg shadow-black/40 backdrop-blur-sm"
                  style:left="{tooltipLeft}px"
                >
                  <p class="text-[0.65rem] font-medium whitespace-nowrap text-muted">
                    {hoverBucket.fullLabel}
                  </p>
                  <p class="text-xs whitespace-nowrap text-text">
                    {numberFmt.format(hoverBucket.chars)}
                    <span class="text-muted">characters</span>
                  </p>
                  <p class="text-[0.65rem] whitespace-nowrap text-muted">
                    {hoverBucket.entries}
                    {hoverBucket.entries === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
              {/if}

              <div class="relative mt-1.5 h-4">
                {#each xTicks as tick (tick.i)}
                  <span
                    class="absolute top-0 text-[0.6rem] whitespace-nowrap text-muted
                      {tick.anchor === 'center'
                        ? '-translate-x-1/2'
                        : tick.anchor === 'end'
                          ? '-translate-x-full'
                          : ''}"
                    style:left="{tick.x}px"
                  >
                    {tick.label}
                  </span>
                {/each}
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
      </div>
    </div>
  </div>
{/if}
