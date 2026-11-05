import { describe, expect, it } from 'vitest';
import { averageDaysFor, binUnitFor, buildTimeline, type DayTotal } from '../src/lib/timeline';
import { keyToDate } from '../src/lib/date';

function days(totals: Record<string, number>): Map<string, DayTotal> {
  return new Map(Object.entries(totals).map(([key, chars]) => [key, { chars, entries: 1 }]));
}

describe('binUnitFor', () => {
  it('draws a year day by day, a few years by week and longer spans by month', () => {
    expect(binUnitFor(30)).toBe('day');
    expect(binUnitFor(366)).toBe('day');
    expect(binUnitFor(401)).toBe('week');
    expect(binUnitFor(7 * 400)).toBe('week');
    expect(binUnitFor(7 * 400 + 1)).toBe('month');
  });
});

describe('averageDaysFor', () => {
  it('widens the window with the range', () => {
    expect(averageDaysFor(30)).toBe(7);
    expect(averageDaysFor(365)).toBe(14);
    expect(averageDaysFor(1000)).toBe(30);
    expect(averageDaysFor(5000)).toBe(90);
  });
});

describe('buildTimeline', () => {
  it('has one bar per day with the characters written that day', () => {
    const t = buildTimeline(
      days({ '2026-03-01': 70, '2026-03-03': 14 }),
      keyToDate('2026-03-01'),
      keyToDate('2026-03-03'),
    );
    expect(t.unit).toBe('day');
    expect(t.bins.map((b) => b.perDay)).toEqual([70, 0, 14]);
    expect(t.bins.map((b) => b.chars)).toEqual([70, 0, 14]);
  });

  it('centres the seven-day average on each day, looking before the range', () => {
    const t = buildTimeline(
      days({ '2026-02-20': 1, '2026-02-26': 7, '2026-03-01': 70, '2026-03-05': 7 }),
      keyToDate('2026-03-01'),
      keyToDate('2026-03-10'),
    );
    expect(t.averageDays).toBe(7);
    // 1 Mar: 26 Feb…4 Mar → 7 + 70. 2 Mar: 27 Feb…5 Mar → 70 + 7.
    expect(t.bins[0].average).toBe(11);
    expect(t.bins[1].average).toBe(11);
    // 5 Mar: 2…8 Mar → only the 7 of 5 Mar.
    expect(t.bins[4].average).toBe(1);
  });

  it('places a gap where it happened instead of after it', () => {
    const totals: Record<string, number> = {};
    for (let d = 1; d <= 28; d++) {
      if (d >= 10 && d <= 16) continue; // a one-week break
      totals[`2026-02-${String(d).padStart(2, '0')}`] = 70;
    }
    const t = buildTimeline(days(totals), keyToDate('2026-02-01'), keyToDate('2026-02-28'));
    const lowest = t.bins.reduce((min, bin) => (bin.average < min.average ? bin : min));
    expect(lowest.key).toBe('2026-02-13'); // the middle of the break
    expect(lowest.average).toBe(0);
  });

  it('only divides by days that could hold writing at either edge', () => {
    // The diary starts on 1 Mar and the range ends today, 3 Mar: the first
    // and last averages see fewer days instead of counting phantom zeros.
    const t = buildTimeline(
      days({ '2026-03-01': 30, '2026-03-02': 30, '2026-03-03': 30 }),
      keyToDate('2026-03-01'),
      keyToDate('2026-03-03'),
    );
    expect(t.bins.map((bin) => bin.average)).toEqual([30, 30, 30]);
  });

  it('reports weekly and monthly bars as characters per day', () => {
    // 2 Jan 2023 is a Monday; the range spans 420 days → weekly bins.
    const t = buildTimeline(
      days({ '2023-01-02': 700, '2023-01-08': 700 }),
      keyToDate('2023-01-02'),
      keyToDate('2024-02-25'),
    );
    expect(t.unit).toBe('week');
    expect(t.averageDays).toBe(30);
    expect(t.bins[0]).toMatchObject({ key: '2023-01-02', chars: 1400, days: 7, perDay: 200 });
    expect(t.bins[1].key).toBe('2023-01-09');
  });

  it('rates a clipped last bin by the days it actually has', () => {
    const t = buildTimeline(
      days({ '2026-09-01': 300 }),
      keyToDate('2018-01-01'),
      keyToDate('2026-09-03'),
    );
    expect(t.unit).toBe('month');
    const last = t.bins.at(-1)!;
    expect(last).toMatchObject({ key: '2026-09-01', days: 3, perDay: 100 });
  });

  it('labels month starts on mid-length ranges and marks January with the year', () => {
    const t = buildTimeline(new Map(), keyToDate('2025-10-01'), keyToDate('2026-09-25'));
    expect(t.ticks.length).toBeLessThanOrEqual(6);
    expect(t.ticks[0]).toEqual({ index: 0, label: expect.any(String) });
    const january = t.ticks.find((tick) => tick.label === '2026');
    if (january) expect(t.bins[january.index].key).toBe('2026-01-01');
    for (const tick of t.ticks) expect(t.bins[tick.index].key.endsWith('-01')).toBe(true);
  });

  it('labels years on long ranges', () => {
    const t = buildTimeline(new Map(), keyToDate('2015-06-01'), keyToDate('2026-09-25'));
    expect(t.ticks.every((tick) => /^\d{4}$/.test(tick.label))).toBe(true);
    expect(t.ticks.length).toBeLessThanOrEqual(6);
  });

  it('is empty for an inverted range', () => {
    expect(buildTimeline(new Map(), keyToDate('2026-03-02'), keyToDate('2026-03-01')).bins).toEqual([]);
  });
});
