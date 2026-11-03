/**
 * Date helpers. Diary entries are day-granular, so we key everything by a
 * local `YYYY-MM-DD` string and deliberately avoid UTC conversions (which would
 * shift a date across midnight depending on the user's timezone).
 */

/** Local-timezone `YYYY-MM-DD` for a Date. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a `YYYY-MM-DD` key back into a local Date at midnight. */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/**
 * Which weekday the calendar grid starts on: 0 = Sunday, 1 = Monday. Stored as
 * a user preference so the grid can match local convention.
 */
export type WeekStart = 0 | 1;

// All visible month/day names come from `Intl` so they follow the system locale
// instead of being hardcoded in English. Formatters are created once and reused.
const fmtMonthYear = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});
const fmtMonthShort = new Intl.DateTimeFormat(undefined, { month: 'short' });
const fmtWeekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

// 1 Jan 2023 was a Sunday — a convenient anchor for naming weekdays by index.
const WEEKDAY_ANCHOR = new Date(2023, 0, 1);

/** Localised "<Month> <year>" label, e.g. "June 2026" / "junio de 2026". */
export function monthLabel(d: Date): string {
  return fmtMonthYear.format(d);
}

/** Long, readable label for a specific day, e.g. "Monday, 8 June 2026". */
export function longDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Compact label for a specific day, e.g. "Thu, Sep 24, 2026". */
export function shortDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Tightest day label, for narrow screens, e.g. "Sep 24, 2026". */
export function compactDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Localised short month names (Jan…Dec), for the header month/year picker. */
export function monthShortLabels(): string[] {
  return Array.from({ length: 12 }, (_, m) =>
    fmtMonthShort.format(new Date(2023, m, 1)),
  );
}

/**
 * Localised short weekday names ordered for the given week start, so the column
 * headers line up with `monthGrid(..., weekStart)`.
 */
export function weekdayLabels(weekStart: WeekStart = 1): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    fmtWeekdayShort.format(
      new Date(2023, 0, WEEKDAY_ANCHOR.getDate() + ((weekStart + i) % 7)),
    ),
  );
}

/**
 * The 6×7 grid of days to render for a month view, including the trailing days
 * of the previous month and leading days of the next so the grid is always
 * full. `weekStart` chooses whether weeks begin on Monday (1) or Sunday (0).
 */
export function monthGrid(monthStart: Date, weekStart: WeekStart = 1): Date[] {
  const lead = (monthStart.getDay() - weekStart + 7) % 7;
  const start = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1 - lead,
  );
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

/**
 * The key strictly before (`dir = -1`) or after (`dir = 1`) `key` in an
 * ascending list of `YYYY-MM-DD` keys, or null at either end. `key` itself
 * need not be in the list. Binary search keeps this cheap for decades of days.
 */
export function adjacentKey(
  sortedKeys: readonly string[],
  key: string,
  dir: -1 | 1,
): string | null {
  // First index whose key is > `key` (dir 1) or >= `key` (dir -1).
  let lo = 0;
  let hi = sortedKeys.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const k = sortedKeys[mid];
    if (dir === 1 ? k <= key : k < key) lo = mid + 1;
    else hi = mid;
  }
  const i = dir === 1 ? lo : lo - 1;
  return sortedKeys[i] ?? null;
}
