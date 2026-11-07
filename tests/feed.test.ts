import { describe, expect, it } from 'vitest';
import { buildFeedRows, feedOffsets, monthRowFor, rowAt, rowForDay } from '../src/lib/feed';
import { keyToDate } from '../src/lib/date';
import type { DiaryEntry } from '../src/lib/types';

function diary(days: Record<string, string[]>) {
  const byDay = new Map<string, DiaryEntry[]>();
  for (const [key, titles] of Object.entries(days)) {
    byDay.set(
      key,
      titles.map((title) => ({ uid: `${key}-${title}`, title, content: '', date: keyToDate(key) })),
    );
  }
  return { dayKeys: [...byDay.keys()].sort(), byDay };
}

const { dayKeys, byDay } = diary({
  '2026-05-30': ['May'],
  '2026-06-08': ['Walk'],
  '2026-06-20': ['Midsummer', 'Night'],
});
const rows = buildFeedRows(dayKeys, byDay);

describe('buildFeedRows', () => {
  it('lists days newest first under a header per month', () => {
    expect(rows.map((r) => (r.kind === 'month' ? r.key : r.entry.title))).toEqual([
      '2026-06',
      'Midsummer',
      'Night',
      'Walk',
      '2026-05',
      'May',
    ]);
  });

  it('marks only the first entry of each day', () => {
    expect(rows.map((r) => r.kind === 'entry' && r.firstOfDay)).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  it('is empty for an empty diary', () => {
    expect(buildFeedRows([], new Map())).toEqual([]);
  });
});

describe('feedOffsets and rowAt', () => {
  const offsets = feedOffsets(rows, 10, 20);

  it('stacks the row heights and ends with the total', () => {
    expect([...offsets]).toEqual([0, 10, 30, 50, 70, 80, 100]);
  });

  it('finds the row under a position, clamped to the list', () => {
    expect(rowAt(offsets, -5)).toBe(0);
    expect(rowAt(offsets, 0)).toBe(0);
    expect(rowAt(offsets, 29.9)).toBe(1);
    expect(rowAt(offsets, 30)).toBe(2);
    expect(rowAt(offsets, 500)).toBe(5);
    expect(rowAt(feedOffsets([], 10, 20), 0)).toBe(0);
  });
});

describe('monthRowFor', () => {
  it('returns the header a row sits under', () => {
    expect(monthRowFor(rows, 3)).toBe(0);
    expect(monthRowFor(rows, 4)).toBe(4);
    expect(monthRowFor(rows, 5)).toBe(4);
  });
});

describe('rowForDay', () => {
  it('finds the first entry of a day', () => {
    expect(rowForDay(rows, '2026-06-20')).toBe(1);
    expect(rowForDay(rows, '2026-06-08')).toBe(3);
  });

  it('falls back to the nearest older day, skipping month headers', () => {
    expect(rowForDay(rows, '2026-12-01')).toBe(1);
    expect(rowForDay(rows, '2026-06-10')).toBe(3);
    expect(rowForDay(rows, '2026-06-01')).toBe(5);
  });

  it('is -1 before the first entry', () => {
    expect(rowForDay(rows, '2026-01-01')).toBe(-1);
  });
});
