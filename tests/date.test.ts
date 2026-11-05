import { describe, it, expect } from 'vitest';
import {
  addMonths,
  adjacentKey,
  dateKey,
  compactDayLabel,
  isSameDay,
  keyToDate,
  longDayLabel,
  monthGrid,
  monthLabel,
  monthShortLabels,
  parseDateFormat,
  startOfMonth,
  weekdayLabels,
  timeAgo,
} from '../src/lib/date';

describe('dateKey', () => {
  it('formats a Date as YYYY-MM-DD using local time', () => {
    const d = new Date(2026, 5, 8); // 8 June 2026
    expect(dateKey(d)).toBe('2026-06-08');
  });

  it('zero-pads single-digit months and days', () => {
    expect(dateKey(new Date(2026, 0, 3))).toBe('2026-01-03');
    expect(dateKey(new Date(2026, 8, 30))).toBe('2026-09-30');
  });
});

describe('keyToDate', () => {
  it('parses a YYYY-MM-DD string into a local Date at midnight', () => {
    const d = keyToDate('2026-06-08');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips with dateKey', () => {
    const original = new Date(2026, 11, 31);
    expect(dateKey(keyToDate(dateKey(original)))).toBe('2026-12-31');
  });
});

describe('isSameDay', () => {
  it('returns true for the same calendar day regardless of time', () => {
    const morning = new Date(2026, 5, 8, 7, 0);
    const evening = new Date(2026, 5, 8, 22, 30);
    expect(isSameDay(morning, evening)).toBe(true);
  });

  it('returns false across midnight', () => {
    const a = new Date(2026, 5, 8, 23, 59);
    const b = new Date(2026, 5, 9, 0, 1);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('startOfMonth', () => {
  it('returns the first day of the month at midnight', () => {
    const d = startOfMonth(new Date(2026, 5, 8));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });
});

describe('addMonths', () => {
  it('adds months within a year', () => {
    const d = new Date(2026, 5, 8);
    expect(addMonths(d, 1)).toEqual(new Date(2026, 6, 1));
  });

  it('crosses a year boundary forward', () => {
    const d = new Date(2026, 11, 15);
    expect(addMonths(d, 1)).toEqual(new Date(2027, 0, 1));
  });

  it('crosses a year boundary backward', () => {
    const d = new Date(2026, 0, 15);
    expect(addMonths(d, -1)).toEqual(new Date(2025, 11, 1));
  });

  it('returns the first of the month (no carryover of the original day)', () => {
    expect(addMonths(new Date(2026, 0, 31), 1).getDate()).toBe(1);
  });
});

describe('monthLabel', () => {
  it('returns a localised "<Month> <year>" label', () => {
    // Locale-agnostic: the year is always present and the label is non-empty.
    const jan = monthLabel(new Date(2026, 0, 1));
    expect(jan).toContain('2026');
    expect(jan.length).toBeGreaterThan(4);
    expect(monthLabel(new Date(2026, 11, 1))).toContain('2026');
  });
});

describe('longDayLabel', () => {
  it('returns a localised long label for the given day', () => {
    const label = longDayLabel(new Date(2026, 5, 8)); // Monday
    // Locale-agnostic check: the year and the day-of-month must appear.
    expect(label).toContain('2026');
    expect(label).toContain('8');
    // The label is non-empty.
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('monthGrid', () => {
  it('always returns 42 days (6 weeks × 7 days)', () => {
    const grid = monthGrid(new Date(2026, 5, 1));
    expect(grid).toHaveLength(42);
  });

  it('starts on a Monday by default', () => {
    const grid = monthGrid(new Date(2026, 5, 1)); // June 2026
    // 1 June 2026 is a Monday, so the grid starts on 1 June.
    expect(grid[0].getDay()).toBe(1);
  });

  it('honours a Sunday week start', () => {
    const grid = monthGrid(new Date(2026, 5, 1), 0); // June 2026, Sunday-first
    expect(grid[0].getDay()).toBe(0); // first cell is a Sunday
    expect(grid).toHaveLength(42);
  });

  it('is contiguous (each day is +1 from the previous)', () => {
    const grid = monthGrid(new Date(2026, 5, 1));
    for (let i = 1; i < grid.length; i++) {
      const diff = grid[i].getTime() - grid[i - 1].getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('always contains every day of the requested month', () => {
    const grid = monthGrid(new Date(2026, 1, 1)); // February (28 days in 2026)
    const inMonth = grid.filter((d) => d.getMonth() === 1);
    expect(inMonth).toHaveLength(28);
  });

  it('pads with trailing/leading days from neighbouring months', () => {
    const grid = monthGrid(new Date(2026, 0, 1)); // January 2026
    const inMonth = grid.filter((d) => d.getMonth() === 0);
    expect(inMonth).toHaveLength(31);
    // The remaining 11 cells are 0 from December 2025 + a few from February.
    const before = grid.filter((d) => d.getMonth() === 11 && d.getFullYear() === 2025);
    const after = grid.filter((d) => d.getMonth() === 1);
    expect(before.length + after.length).toBe(11);
  });
});

describe('weekdayLabels', () => {
  it('returns 7 labels ordered from the given week start', () => {
    const monFirst = weekdayLabels(1);
    const sunFirst = weekdayLabels(0);
    expect(monFirst).toHaveLength(7);
    expect(sunFirst).toHaveLength(7);
    // Same set of names, just rotated: Monday-first starts where Sunday-first's
    // second entry is.
    expect(monFirst[0]).toBe(sunFirst[1]);
    expect(sunFirst[0]).toBe(monFirst[6]);
  });

  it('defaults to a Monday-first ordering', () => {
    expect(weekdayLabels()).toEqual(weekdayLabels(1));
  });
});

describe('monthShortLabels', () => {
  it('returns 12 non-empty, distinct short month names', () => {
    const labels = monthShortLabels();
    expect(labels).toHaveLength(12);
    expect(new Set(labels).size).toBe(12);
    expect(labels.every((l) => l.length > 0)).toBe(true);
  });
});

describe('adjacentKey', () => {
  const keys = ['2024-01-05', '2025-03-10', '2026-09-24', '2026-09-25'];

  it('finds the neighbouring keys of a listed key', () => {
    expect(adjacentKey(keys, '2026-09-24', -1)).toBe('2025-03-10');
    expect(adjacentKey(keys, '2026-09-24', 1)).toBe('2026-09-25');
  });

  it('finds the neighbours of a key that is not listed', () => {
    expect(adjacentKey(keys, '2025-12-31', -1)).toBe('2025-03-10');
    expect(adjacentKey(keys, '2025-12-31', 1)).toBe('2026-09-24');
  });

  it('returns null past either end', () => {
    expect(adjacentKey(keys, '2024-01-05', -1)).toBeNull();
    expect(adjacentKey(keys, '2026-09-25', 1)).toBeNull();
    expect(adjacentKey([], '2026-09-25', 1)).toBeNull();
  });
});

describe('date formats', () => {
  const day = new Date(2026, 5, 8); // Monday, 8 June 2026

  it('orders fields as requested while keeping the weekday', () => {
    const dmy = longDayLabel(day, 'dmy');
    expect(dmy).toMatch(/^[^,]+, 8 \S+ 2026$/);
    expect(longDayLabel(day, 'mdy')).toMatch(/^[^,]+, \S+ 8, 2026$/);
    expect(longDayLabel(day, 'iso')).toMatch(/^[^,]+, 2026-06-08$/);
  });

  it('omits the weekday from the compact label', () => {
    expect(compactDayLabel(day, 'iso')).toBe('2026-06-08');
    expect(compactDayLabel(day, 'dmy')).toMatch(/^8 \S+ 2026$/);
  });

  it('falls back to auto for unknown stored values', () => {
    expect(parseDateFormat('nope')).toBe('auto');
    expect(parseDateFormat(undefined)).toBe('auto');
    expect(parseDateFormat('mdy')).toBe('mdy');
  });
});

describe('timeAgo', () => {
  const now = new Date(2026, 10, 5, 9, 30);

  it('counts calendar days, not hours', () => {
    expect(timeAgo(new Date(2026, 10, 5, 0, 5), now)).toBe('today');
    expect(timeAgo(new Date(2026, 10, 4, 23, 50), now)).toBe('yesterday');
    expect(timeAgo(new Date(2026, 10, 2), now)).toBe('3 days ago');
  });

  it('switches to weeks, months and years', () => {
    expect(timeAgo(new Date(2026, 9, 22), now)).toBe('2 weeks ago');
    expect(timeAgo(new Date(2026, 7, 1), now)).toBe('3 months ago');
    expect(timeAgo(new Date(2024, 10, 1), now)).toBe('2 years ago');
  });

  it('treats a clock slightly ahead of this one as today', () => {
    expect(timeAgo(new Date(2026, 10, 6), now)).toBe('today');
  });
});
