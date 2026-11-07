/**
 * The phone home screen's entry feed: every entry, newest first, split by
 * month headers. Rows have fixed heights so a diary spanning decades can be
 * virtualised with plain arithmetic (no measuring). Pure and DOM-free so it
 * can be unit-tested.
 */
import { keyToDate, startOfMonth } from './date';
import type { DiaryEntry } from './types';

export type FeedRow =
  | { kind: 'month'; key: string; month: Date }
  | { kind: 'entry'; key: string; dayKey: string; entry: DiaryEntry; firstOfDay: boolean };

/** Row heights in rem. Each row's content must fit them exactly. */
export const FEED_MONTH_REM = 2.75;
export const FEED_ENTRY_REM = 4.75;

/**
 * Rows for `entriesByDay`, newest day first. `dayKeys` is every day with
 * entries in ascending order (as `app.dayKeys` keeps it).
 */
export function buildFeedRows(
  dayKeys: readonly string[],
  entriesByDay: ReadonlyMap<string, readonly DiaryEntry[]>,
): FeedRow[] {
  const rows: FeedRow[] = [];
  let monthKey = '';
  for (let i = dayKeys.length - 1; i >= 0; i--) {
    const dayKey = dayKeys[i];
    const entries = entriesByDay.get(dayKey);
    if (!entries?.length) continue;
    const month = dayKey.slice(0, 7);
    if (month !== monthKey) {
      monthKey = month;
      rows.push({ kind: 'month', key: month, month: startOfMonth(keyToDate(dayKey)) });
    }
    entries.forEach((entry, j) => {
      rows.push({ kind: 'entry', key: entry.uid, dayKey, entry, firstOfDay: j === 0 });
    });
  }
  return rows;
}

/** Top offset of each row in px, plus the total height as the last item. */
export function feedOffsets(rows: readonly FeedRow[], monthPx: number, entryPx: number): Float64Array {
  const offsets = new Float64Array(rows.length + 1);
  for (let i = 0; i < rows.length; i++) {
    offsets[i + 1] = offsets[i] + (rows[i].kind === 'month' ? monthPx : entryPx);
  }
  return offsets;
}

/** Index of the row covering `y` (clamped to the rows that exist). */
export function rowAt(offsets: Float64Array, y: number): number {
  const count = offsets.length - 1;
  if (count <= 0) return 0;
  let lo = 0;
  let hi = count - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= y) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Index of the month header the row at `index` sits under (-1 if none). */
export function monthRowFor(rows: readonly FeedRow[], index: number): number {
  for (let i = Math.min(index, rows.length - 1); i >= 0; i--) {
    if (rows[i].kind === 'month') return i;
  }
  return -1;
}

/**
 * Index of the first entry row for `dayKey`, or for the nearest older day
 * when it has none (the newest-first feed continues there). -1 if no entry is
 * that old.
 */
export function rowForDay(rows: readonly FeedRow[], dayKey: string): number {
  let lo = 0;
  let hi = rows.length;
  // Rows are newest first: find the first entry row whose day is <= dayKey.
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const row = rows[mid];
    const key = row.kind === 'entry' ? row.dayKey : `${row.key}-32`;
    if (key <= dayKey) hi = mid;
    else lo = mid + 1;
  }
  while (lo < rows.length && rows[lo].kind !== 'entry') lo++;
  return lo < rows.length ? lo : -1;
}
