/**
 * The time series behind the statistics charts: bars for each day (or week, or
 * month on very long ranges) and a moving average drawn as a line on top.
 *
 * The average is centred on each bar (half its window before, half after), so
 * a gap or a burst shows up exactly where it happened instead of trailing
 * behind it. A series is either a *rate* (characters written per day, where a
 * day with nothing counts as zero) or a *mean* (the score given on the days
 * that have one, where a day without is simply missing). Either way bins of
 * different lengths (a 28-day February, a week clipped by the range edge, the
 * month still in progress) stay comparable. Pure and DOM-free so it can be
 * unit-tested.
 */
import {
  addDays,
  dateKey,
  daysBetween,
  keyToDate,
  longDayLabel,
  monthLabel,
  monthShortLabels,
  shortDayLabel,
  type DateFormat,
} from './date';

/** How many days one bar of the chart covers. */
export type BinUnit = 'day' | 'week' | 'month';

/**
 * What one day holds: `total` is the characters written or the score given,
 * `count` the entries or scores behind it.
 */
export interface DayTotal {
  total: number;
  count: number;
}

/**
 * How a series turns days into values. A `rate` divides by days (characters
 * per day); a `mean` divides by the days that have a value (the average score).
 */
export type TimelineMeasure = 'rate' | 'mean';

export interface TimelineBin {
  /** First day of the bin inside the range, `YYYY-MM-DD`. */
  key: string;
  /** Readable tooltip label, e.g. "Thursday, July 10, 2025" / "July 2025". */
  fullLabel: string;
  total: number;
  count: number;
  /** Days of the bin inside the range (a clipped edge bin has fewer). */
  days: number;
  /** The bar height: `total / days` for a rate, `total / count` for a mean. */
  value: number;
  /**
   * The centred `averageDays` average at the bin's middle day. Null for a mean
   * with no value anywhere in the window.
   */
  average: number | null;
}

export interface TimelineTick {
  /** Index of the bin the label belongs to. */
  index: number;
  label: string;
}

export interface Timeline {
  unit: BinUnit;
  /** Window of the moving average, in days. */
  averageDays: number;
  bins: TimelineBin[];
  ticks: TimelineTick[];
}

/** Longest range still drawn one bar per day (a year plus some slack). */
const DAILY_BINS_MAX_DAYS = 400;
/** Longest range drawn one bar per week (~7.5 years); monthly beyond. */
const WEEKLY_BINS_MAX_DAYS = 7 * 400;
/** Ranges up to this long smooth over a week; longer ones over a month+. */
const SHORT_RANGE_DAYS = 62;
const MAX_TICKS = 6;
/** Ranges up to this long label months; longer ones label years. */
const MONTH_TICKS_MAX_DAYS = 3 * 366;

export const EMPTY_TIMELINE: Timeline = {
  unit: 'day',
  averageDays: 7,
  bins: [],
  ticks: [],
};

const fmtDayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

export function binUnitFor(spanDays: number): BinUnit {
  if (spanDays <= DAILY_BINS_MAX_DAYS) return 'day';
  if (spanDays <= WEEKLY_BINS_MAX_DAYS) return 'week';
  return 'month';
}

/**
 * Moving-average window, in days: short enough that a two-week break visibly
 * dips the line, long enough to read a trend through day-to-day noise. It
 * widens with the bars, so the line always spans a few of them.
 */
export function averageDaysFor(spanDays: number): number {
  if (spanDays <= SHORT_RANGE_DAYS) return 7;
  const unit = binUnitFor(spanDays);
  return unit === 'day' ? 14 : unit === 'week' ? 30 : 90;
}

/** Whether `day` opens a new bin (weeks start on Monday). */
function startsBin(day: Date, unit: BinUnit): boolean {
  if (unit === 'day') return true;
  if (unit === 'week') return day.getDay() === 1;
  return day.getDate() === 1;
}

function binLabel(start: Date, unit: BinUnit, format: DateFormat): string {
  if (unit === 'day') return longDayLabel(start, format);
  if (unit === 'week') return `Week of ${shortDayLabel(start, format)}`;
  return monthLabel(start);
}

/** Pick at most `max` items, spread evenly, always keeping first and last. */
function thin<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const picked = new Set<number>();
  for (let t = 0; t < max; t++) {
    picked.add(Math.round((t * (items.length - 1)) / (max - 1)));
  }
  return [...picked].map((i) => items[i]);
}

/**
 * Build the chart series for the inclusive day range `start`…`end` from
 * per-day totals keyed by `YYYY-MM-DD`. `days` may hold days outside the
 * range: those before `start` feed the first averages, so the line does not
 * dive at the left edge. For a rate, a window is clipped to the days that
 * could hold writing — none before the first written day, none after `end` —
 * and divided by the days it kept, so neither edge reads as an artificial drop.
 */
export function buildTimeline(
  days: ReadonlyMap<string, DayTotal>,
  start: Date,
  end: Date,
  format: DateFormat = 'auto',
  measure: TimelineMeasure = 'rate',
): Timeline {
  const span = daysBetween(start, end) + 1;
  if (span <= 0) return EMPTY_TIMELINE;

  const unit = binUnitFor(span);
  const window = averageDaysFor(span);
  const tickMode = span <= SHORT_RANGE_DAYS ? 'day' : span <= MONTH_TICKS_MAX_DAYS ? 'month' : 'year';
  const monthNames = monthShortLabels();

  let firstWritten: Date | null = null;
  for (const key of days.keys()) {
    const date = keyToDate(key);
    if (firstWritten === null || date < firstWritten) firstWritten = date;
  }

  // Daily series from `lead` days before the range through `end`, as running
  // sums of the totals and of what they are divided by (countable days for a
  // rate, values for a mean): any window is two subtractions.
  const lead = Math.floor(window / 2);
  const length = lead + span;
  const sums = new Float64Array(length + 1);
  const counted = new Int32Array(length + 1);
  const origin = addDays(start, -lead);

  const bins: TimelineBin[] = [];
  const binStarts: number[] = [];
  const boundaries: TimelineTick[] = [];
  let day = origin;
  for (let j = 0; j < length; j++, day = addDays(day, 1)) {
    const key = dateKey(day);
    const dayTotal = days.get(key);
    const total = dayTotal?.total ?? 0;
    sums[j + 1] = sums[j] + total;
    counted[j + 1] =
      counted[j] +
      (measure === 'mean'
        ? (dayTotal?.count ?? 0)
        : firstWritten !== null && day >= firstWritten
          ? 1
          : 0);

    const i = j - lead; // index within the range
    if (i < 0) continue;
    if (i === 0 || startsBin(day, unit)) {
      binStarts.push(j);
      bins.push({
        key,
        fullLabel: binLabel(day, unit, format),
        total: 0,
        count: 0,
        days: 0,
        value: 0,
        average: null,
      });
    }
    const bin = bins[bins.length - 1];
    bin.total += total;
    bin.count += dayTotal?.count ?? 0;
    bin.days += 1;
    bin.value = measure === 'mean' ? (bin.count > 0 ? bin.total / bin.count : 0) : bin.total / bin.days;

    if (tickMode === 'month' && day.getDate() === 1) {
      const month = day.getMonth();
      // January shows the year, so a range across New Year stays readable.
      boundaries.push({
        index: bins.length - 1,
        label: month === 0 ? String(day.getFullYear()) : monthNames[month],
      });
    } else if (tickMode === 'year' && day.getDate() === 1 && day.getMonth() === 0) {
      boundaries.push({ index: bins.length - 1, label: String(day.getFullYear()) });
    }
  }

  bins.forEach((bin, b) => {
    const middle = binStarts[b] + Math.floor((bin.days - 1) / 2);
    const lo = Math.max(0, middle - lead);
    const hi = Math.min(length, lo + window); // exclusive
    const n = counted[hi] - counted[lo];
    bin.average = n > 0 ? (sums[hi] - sums[lo]) / n : measure === 'mean' ? null : 0;
  });

  const ticks =
    tickMode === 'day'
      ? thin(
          bins.map((bin, index) => ({ index, label: fmtDayMonth.format(keyToDate(bin.key)) })),
          MAX_TICKS,
        )
      : thin(boundaries, MAX_TICKS);

  return { unit, averageDays: window, bins, ticks };
}
