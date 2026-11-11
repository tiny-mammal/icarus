<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    barsPath,
    compactNumber,
    monotoneLinePath,
    niceCeil,
    placeTooltip,
    type ChartPoint,
  } from '../lib/chart';
  import type { BinUnit, Timeline, TimelineBin } from '../lib/timeline';

  /**
   * A statistics time series: one bar per bin and the moving average as a
   * line over them, with a hover tooltip whose content the caller supplies.
   * The caller keeps the heading and the empty state.
   */
  let {
    timeline,
    label,
    yMax: fixedMax,
    reference,
    rate = true,
    tooltip,
  }: {
    timeline: Timeline;
    /** What the chart shows, for assistive tech. */
    label: string;
    /** Top of the value axis; the data's own maximum (rounded up) when unset. */
    yMax?: number;
    /** A level worth marking across the chart, such as a pass mark. */
    reference?: { value: number; label: string };
    /** Bars are amounts per day, so a week or month bar says so in the legend. */
    rate?: boolean;
    /** The tooltip's content for the hovered bin. */
    tooltip: Snippet<[TimelineBin]>;
  } = $props();

  const BAR_NOUN: Record<BinUnit, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

  // --- chart geometry -----------------------------------------------------
  const CHART_HEIGHT = 190;
  const PAD = { top: 14, right: 10, bottom: 6, left: 40 } as const;
  const PLOT_HEIGHT = CHART_HEIGHT - PAD.top - PAD.bottom;
  const BASELINE = PAD.top + PLOT_HEIGHT;

  let chartWidth = $state(0);
  let hoverIndex = $state<number | null>(null);

  const bins = $derived(timeline.bins);
  const yMax = $derived(
    fixedMax ??
      niceCeil(bins.reduce((max, bin) => Math.max(max, bin.value, bin.average ?? 0), 0)),
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
      top: yOf(bin.value),
    })),
  );
  const barPath = $derived(barsPath(bars, BASELINE));
  const averagePoints = $derived<(ChartPoint | null)[]>(
    bins.map((bin, i) =>
      bin.average === null ? null : { x: PAD.left + (i + 0.5) * bandWidth, y: yOf(bin.average) },
    ),
  );
  // The line stops where there is nothing to average and starts again after;
  // a stretch of one bin is a dot.
  const average = $derived.by(() => {
    const paths: string[] = [];
    const dots: ChartPoint[] = [];
    let run: ChartPoint[] = [];
    const flush = () => {
      if (run.length === 1) dots.push(run[0]);
      else if (run.length > 1) paths.push(monotoneLinePath(run));
      run = [];
    };
    for (const point of averagePoints) {
      if (point) run.push(point);
      else flush();
    }
    flush();
    return { paths, dots };
  });

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
  const hoverPoint = $derived(hoverIndex === null ? null : (averagePoints[hoverIndex] ?? null));
  const hoverX = $derived(hoverIndex === null ? 0 : PAD.left + (hoverIndex + 0.5) * bandWidth);

  // The tooltip may rise over the chart heading so it can sit above most
  // points instead of covering them. It clears both the bar and the line.
  const TOOLTIP_HEADROOM = 28;
  let tooltipWidth = $state(0);
  let tooltipHeight = $state(0);
  const tooltipBox = $derived(
    hoverBar
      ? placeTooltip(
          { x: hoverX, y: Math.min(hoverPoint?.y ?? hoverBar.top, hoverBar.top) },
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
</script>

<div class="relative" bind:clientWidth={chartWidth}>
  <svg
    width={chartWidth}
    height={CHART_HEIGHT}
    class="block [touch-action:pan-y]"
    onpointermove={onChartMove}
    onpointerdown={onChartMove}
    onpointerleave={() => (hoverIndex = null)}
    role="img"
    aria-label={label}
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

    {#if reference}
      <line
        x1={PAD.left}
        x2={Math.max(PAD.left, chartWidth - PAD.right)}
        y1={yOf(reference.value)}
        y2={yOf(reference.value)}
        stroke="var(--color-sun)"
        stroke-width="1"
        stroke-dasharray="4 4"
        opacity="0.75"
      />
    {/if}

    {#if hoverBar}
      <line
        x1={hoverX}
        x2={hoverX}
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

    {#each average.paths as path}
      <path
        d={path}
        fill="none"
        stroke="var(--color-text)"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    {/each}
    {#each average.dots as dot}
      <circle cx={dot.x} cy={dot.y} r="3.5" fill="var(--color-text)" />
    {/each}

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
      <p class="text-[0.65rem] font-medium whitespace-nowrap text-muted">{hoverBin.fullLabel}</p>
      {@render tooltip(hoverBin)}
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
      {BAR_NOUN[timeline.unit]}{rate && timeline.unit !== 'day' ? ' (per day)' : ''}
    </span>
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-[2px] w-3 rounded-full bg-text"></span>
      {timeline.averageDays}-day average
    </span>
    {#if reference}
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 border-t border-dashed border-sun"></span>
        {reference.label}
      </span>
    {/if}
  </div>
</div>
