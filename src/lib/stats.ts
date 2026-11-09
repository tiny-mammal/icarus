/**
 * Diary statistics: pure aggregation over committed entries, shared by the
 * statistics modal. Deliberately free of Svelte and DOM concerns so the maths
 * can be unit-tested and the modal only has to worry about presentation.
 */
import type { DiaryEntry } from './types';
import {
  addMonths,
  dateKey,
  keyToDate,
  rangeLabel,
  startOfDay,
  startOfMonth,
  type DateFormat,
} from './date';
import { isInvalidDate } from './ical';
import { countChars } from './text-count';
import { EMPTY_TIMELINE, buildTimeline, type DayTotal, type Timeline } from './timeline';

/** The fixed time windows the statistics modal offers. */
export type StatsPreset = '30d' | '12m' | 'year' | 'all';

/** A window the user picked by hand: local `YYYY-MM-DD` keys, both inclusive. */
export interface CustomRange {
  start: string;
  end: string;
}

/** The time window the statistics cover. */
export type StatsPeriod = StatsPreset | CustomRange;

export interface StatsPresetOption {
  value: StatsPreset;
  label: string;
}

/** Preset choices, in the order they appear in the selector. */
export const STATS_PRESETS: readonly StatsPresetOption[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '12m', label: 'Last year' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

/** Aggregated characters for one calendar day. */
export interface DayStat {
  /** Local `YYYY-MM-DD`. */
  key: string;
  date: Date;
  chars: number;
  entries: number;
}

export interface DiaryStats {
  period: StatsPeriod;
  totalEntries: number;
  totalChars: number;
  /** Mean characters per entry in the period (0 when there are none). */
  averageChars: number;
  /** Day with the most characters in the period (null when there are none). */
  bestDay: DayStat | null;
  /** Up to ten days with the most characters, descending. */
  ranking: DayStat[];
  /** Characters-per-day series for the chart (no bins when nothing to chart). */
  timeline: Timeline;
}

const MAX_RANKING = 10;
/**
 * How far from today a date may sit and still count in an all-time view, in
 * years. Corrupt dates (a far-future VEVENT, a stray year-0300 entry) are
 * skipped so they cannot balloon the chart or crowd out the real diary, while
 * every entry within the window survives however extreme its neighbour is.
 */
const MAX_YEARS_FROM_TODAY = 200;

/**
 * Characters that count towards the statistics: the visible body of an entry,
 * counted like the editor's counter. Titles and locations are ignored so the
 * metric tracks actual writing volume.
 */
export function entryChars(entry: DiaryEntry): number {
  const hit = charCache.get(entry);
  if (hit?.content === entry.content) return hit.chars;
  const chars = countChars(entry.content);
  charCache.set(entry, { content: entry.content, chars });
  return chars;
}

// Counting means stripping Markdown, too slow to redo over a many-year diary
// every time the period changes. Keyed by entry, checked against its content
// so an edit made in place still recounts.
const charCache = new WeakMap<DiaryEntry, { content: string; chars: number }>();

export function isCustomRange(period: StatsPeriod): period is CustomRange {
  return typeof period === 'object';
}

/** Readable name of a period, e.g. "Last 30 days" or "3 Mar – 14 Apr 2025". */
export function periodLabel(period: StatsPeriod, format: DateFormat = 'auto'): string {
  if (isCustomRange(period)) {
    return rangeLabel(keyToDate(period.start), keyToDate(period.end), format);
  }
  return STATS_PRESETS.find((p) => p.value === period)?.label ?? '';
}

/** Inclusive day range a period covers. */
export interface StatsRange {
  start: Date;
  end: Date;
}

/**
 * The days `period` covers, or null when there is nothing to cover (all time
 * over a diary without real dates). Custom ranges are taken as given, either
 * way round.
 */
export function periodRange(
  period: StatsPeriod,
  entries: readonly DiaryEntry[],
  now: Date = new Date(),
): StatsRange | null {
  if (isCustomRange(period)) {
    const [start, end] = [period.start, period.end].sort().map(keyToDate);
    return { start, end };
  }
  const today = startOfDay(now);
  if (period === '30d') {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29),
      end: today,
    };
  }
  if (period === '12m') {
    return { start: addMonths(startOfMonth(today), -11), end: today };
  }
  if (period === 'year') {
    return { start: new Date(today.getFullYear(), 0, 1), end: today };
  }

  // All time: from the first entry to the latest entry (or today, whichever
  // is later). Entries with an unparseable DTSTART carry the year-9999
  // sentinel, and a corrupt far-off date (a stray 3000 or 0300 VEVENT) must
  // not stretch the chart across centuries — both are skipped, so real
  // entries around today always survive. Without any real date there is
  // nothing to chart.
  let first: Date | null = null;
  let last: Date | null = null;
  for (const entry of entries) {
    if (!isChartable(entry, now)) continue;
    if (first === null || entry.date < first) first = entry.date;
    if (last === null || entry.date > last) last = entry.date;
  }
  if (first === null || last === null) return null;
  return { start: startOfDay(first), end: last > today ? startOfDay(last) : today };
}

/** A real date within the window statistics consider at all. */
function isChartable(entry: DiaryEntry, now: Date): boolean {
  if (isInvalidDate(entry.date)) return false;
  const year = entry.date.getFullYear();
  return Math.abs(year - now.getFullYear()) <= MAX_YEARS_FROM_TODAY;
}

/** Aggregate `entries` for the given period. */
export function computeStats(
  entries: readonly DiaryEntry[],
  period: StatsPeriod,
  now: Date = new Date(),
  format: DateFormat = 'auto',
): DiaryStats {
  const range = periodRange(period, entries, now);
  if (!range) {
    return {
      period,
      totalEntries: 0,
      totalChars: 0,
      averageChars: 0,
      bestDay: null,
      ranking: [],
      timeline: EMPTY_TIMELINE,
    };
  }

  // Every day with writing, including days before the range: the chart's
  // moving average looks back past its first bar.
  const totals = new Map<string, DayTotal>();
  const days = new Map<string, DayStat>();
  let totalEntries = 0;
  let totalChars = 0;
  for (const entry of entries) {
    // Unparseable dates are placeholders, not days the user wrote on.
    if (!isChartable(entry, now)) continue;
    const key = dateKey(entry.date);
    const chars = entryChars(entry);

    const total = totals.get(key);
    if (total) {
      total.chars += chars;
      total.entries += 1;
    } else {
      totals.set(key, { chars, entries: 1 });
    }

    const day = startOfDay(entry.date);
    if (day < range.start || day > range.end) continue; // outside the period
    totalEntries += 1;
    totalChars += chars;
    const stat = days.get(key);
    if (stat) {
      stat.chars += chars;
      stat.entries += 1;
    } else {
      days.set(key, { key, date: day, chars, entries: 1 });
    }
  }

  const ranking = [...days.values()]
    .sort((a, b) => b.chars - a.chars || (a.key < b.key ? 1 : -1))
    .slice(0, MAX_RANKING);

  return {
    period,
    totalEntries,
    totalChars,
    averageChars: totalEntries > 0 ? totalChars / totalEntries : 0,
    bestDay: ranking[0] && ranking[0].chars > 0 ? ranking[0] : null,
    ranking,
    timeline: buildTimeline(totals, range.start, range.end, format),
  };
}
