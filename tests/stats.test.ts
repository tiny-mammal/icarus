import { describe, expect, it } from 'vitest';
import {
  computeStats,
  entryChars,
  periodLabel,
  periodRange,
  type StatsPeriod,
} from '../src/lib/stats';
import { keyToDate } from '../src/lib/date';
import type { DiaryEntry } from '../src/lib/types';

let seq = 0;

/** Minimal entry on `day` with the given body. */
function entry(day: string, content: string, title = 'Entry'): DiaryEntry {
  return {
    uid: `test-${seq++}@icarus.diary`,
    title,
    content,
    date: keyToDate(day),
  };
}

const NOW = new Date(2026, 8, 25); // 25 Sep 2026

describe('entryChars', () => {
  it('counts the characters of the entry body', () => {
    expect(entryChars(entry('2026-09-25', 'hello'))).toBe(5);
  });

  it('ignores the title and location', () => {
    const e = entry('2026-09-25', 'body', 'A much longer title indeed');
    expect(entryChars(e)).toBe(4);
  });
});

describe('computeStats — last 30 days', () => {
  const entries = [
    entry('2026-08-26', 'x'.repeat(5)), // 30 days back → outside
    entry('2026-08-27', 'x'.repeat(3)), // 29 days back → first bucket
    entry('2026-09-25', 'x'.repeat(10)), // today
    entry('2026-09-26', 'x'.repeat(99)), // future → outside
  ];

  it('covers exactly the last 30 days, today included', () => {
    const stats = computeStats(entries, '30d', NOW);
    expect(stats.timeline.bins).toHaveLength(30);
    expect(stats.timeline.unit).toBe('day');
    expect(stats.timeline.bins[0].key).toBe('2026-08-27');
    expect(stats.timeline.bins.at(-1)?.key).toBe('2026-09-25');
  });

  it('only totals entries inside the window', () => {
    const stats = computeStats(entries, '30d', NOW);
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalChars).toBe(13);
    expect(stats.averageChars).toBe(6.5);
  });
});

describe('computeStats — this year (calendar year)', () => {
  const entries = [
    entry('2025-12-31', 'old', 'Old'),
    entry('2026-01-01', 'ab', 'New year'),
    entry('2026-09-25', 'abcde', 'Today'),
  ];

  it('runs day by day from January 1 to today', () => {
    const stats = computeStats(entries, 'year', NOW);
    expect(stats.timeline.unit).toBe('day');
    expect(stats.timeline.bins[0].key).toBe('2026-01-01');
    expect(stats.timeline.bins.at(-1)?.key).toBe('2026-09-25');
    expect(stats.timeline.bins).toHaveLength(268);
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalChars).toBe(7);
  });

  it('puts characters on the right day', () => {
    const stats = computeStats(entries, 'year', NOW);
    expect(stats.timeline.bins[0].total).toBe(2);
    expect(stats.timeline.bins.at(-1)?.total).toBe(5);
  });
});

describe('computeStats — last year (trailing 12 months)', () => {
  it('spans from the start of the month eleven months back to today', () => {
    const entries = [
      entry('2025-10-01', 'aa'),
      entry('2025-12-24', 'bb'),
      entry('2026-09-25', 'cc'),
      entry('2025-09-30', 'excluded'),
    ];
    const stats = computeStats(entries, '12m', NOW);
    expect(stats.timeline.bins).toHaveLength(360);
    expect(stats.timeline.bins[0].key).toBe('2025-10-01');
    expect(stats.timeline.bins.at(-1)?.key).toBe('2026-09-25');
    expect(stats.totalEntries).toBe(3);
  });
});

describe('computeStats — all time', () => {
  it('uses weekly bins for a couple of years of history', () => {
    const entries = [entry('2025-01-10', 'a'), entry('2026-09-25', 'bb')];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.timeline.unit).toBe('week');
    // The first week is clipped to the first entry; later ones start on Monday.
    expect(stats.timeline.bins[0].key).toBe('2025-01-10');
    expect(stats.timeline.bins[1].key).toBe('2025-01-13');
    expect(stats.timeline.bins.at(-1)?.key).toBe('2026-09-21');
  });

  it('switches to monthly bins for long histories', () => {
    const entries = [entry('2018-01-10', 'a'), entry('2026-09-25', 'bb')];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.timeline.unit).toBe('month');
    expect(stats.timeline.bins[0].key).toBe('2018-01-10');
    expect(stats.timeline.bins[1].key).toBe('2018-02-01');
    expect(stats.timeline.bins.at(-1)?.key).toBe('2026-09-01');
    expect(stats.totalChars).toBe(3);
  });

  it('extends to a future-dated entry rather than cutting it off', () => {
    const entries = [entry('2026-09-25', 'a'), entry('2026-11-02', 'bbb')];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.timeline.bins.at(-1)?.key).toBe('2026-11-02');
    expect(stats.totalChars).toBe(4);
  });

  it('ignores entries with an unparseable-date placeholder', () => {
    const placeholder: DiaryEntry = {
      uid: 'sentinel@icarus.diary',
      title: 'Broken date',
      content: 'x'.repeat(1000),
      date: new Date(9999, 0, 1),
    };
    const stats = computeStats([entry('2026-09-25', 'aaa'), placeholder], 'all', NOW);
    expect(stats.timeline.bins.map((b) => b.key)).toEqual(['2026-09-25']);
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalChars).toBe(3);
    expect(stats.bestDay?.chars).toBe(3);
  });

  it('has nothing to chart when every date is a placeholder', () => {
    const placeholder: DiaryEntry = {
      uid: 'sentinel@icarus.diary',
      title: 'Broken date',
      content: 'text',
      date: new Date(9999, 0, 1),
    };
    const stats = computeStats([placeholder], 'all', NOW);
    expect(stats.timeline.bins).toEqual([]);
    expect(stats.totalEntries).toBe(0);
    expect(stats.bestDay).toBeNull();
  });

  it('keeps real history when one date is absurdly far in the future', () => {
    const stats = computeStats(
      [
        entry('2025-06-01', 'aaa'),
        entry('2026-09-25', 'bb'),
        entry('3000-01-01', 'x'.repeat(50)),
      ],
      'all',
      NOW,
    );
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalChars).toBe(5);
    expect(stats.timeline.bins[0].key).toBe('2025-06-01');
    expect(stats.timeline.bins.at(-1)?.key).toBe('2026-09-21'); // weekly bins
    expect(stats.bestDay?.key).toBe('2025-06-01');
    expect(stats.ranking.some((day) => day.key.startsWith('3000'))).toBe(false);
  });

  it('keeps modern history when one date is absurdly far in the past', () => {
    const stats = computeStats(
      [entry('0300-01-01', 'ancient'), entry('2026-09-25', 'bb')],
      'all',
      NOW,
    );
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalChars).toBe(2);
    expect(stats.timeline.bins.map((b) => b.key)).toEqual(['2026-09-25']);
    expect(stats.ranking.some((day) => day.key.startsWith('0300'))).toBe(false);
  });

  it('counts dates up to the window edge and drops anything beyond', () => {
    const edge = computeStats([entry('2226-01-01', 'edge')], 'all', NOW);
    expect(edge.totalEntries).toBe(1);
    expect(edge.timeline.bins.at(-1)?.key).toBe('2226-01-01');

    const beyond = computeStats([entry('2227-01-01', 'beyond')], 'all', NOW);
    expect(beyond.totalEntries).toBe(0);
    expect(beyond.timeline.bins).toEqual([]);
  });
});

describe('computeStats — day ranking', () => {
  it('sums all entries of a day before ranking', () => {
    const entries = [
      entry('2026-09-20', 'x'.repeat(10)),
      entry('2026-09-20', 'x'.repeat(5)),
      entry('2026-09-21', 'x'.repeat(12)),
    ];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.ranking[0].key).toBe('2026-09-20');
    expect(stats.ranking[0].chars).toBe(15);
    expect(stats.ranking[0].entries).toBe(2);
    expect(stats.bestDay?.key).toBe('2026-09-20');
  });

  it('breaks ties by most recent day', () => {
    const entries = [
      entry('2026-09-10', 'x'.repeat(20)),
      entry('2026-09-12', 'x'.repeat(20)),
    ];
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.ranking.map((d) => d.key)).toEqual(['2026-09-12', '2026-09-10']);
  });

  it('keeps only the ten best days', () => {
    const entries = Array.from({ length: 14 }, (_, i) =>
      entry(`2026-08-${String(i + 1).padStart(2, '0')}`, 'x'.repeat(i + 1)),
    );
    const stats = computeStats(entries, 'all', NOW);
    expect(stats.ranking).toHaveLength(10);
    expect(stats.ranking[0].chars).toBe(14);
    expect(stats.ranking.at(-1)?.chars).toBe(5);
  });

  it('ignores days outside the selected period', () => {
    const entries = [
      entry('2025-01-01', 'x'.repeat(100)),
      entry('2026-09-25', 'x'),
    ];
    const stats = computeStats(entries, '30d', NOW);
    expect(stats.ranking.map((d) => d.key)).toEqual(['2026-09-25']);
  });
});

describe('computeStats — custom range', () => {
  const entries = [
    entry('2025-03-02', 'x'.repeat(7)), // the day before → outside
    entry('2025-03-03', 'x'.repeat(3)), // first day
    entry('2025-03-14', 'x'.repeat(4)), // last day
    entry('2025-03-15', 'x'.repeat(9)), // the day after → outside
  ];

  it('covers both ends inclusively', () => {
    const stats = computeStats(entries, { start: '2025-03-03', end: '2025-03-14' }, NOW);
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalChars).toBe(7);
    expect(stats.timeline.bins).toHaveLength(12);
    expect(stats.timeline.bins[0].key).toBe('2025-03-03');
    expect(stats.timeline.bins.at(-1)?.key).toBe('2025-03-14');
  });

  it('accepts the ends either way round', () => {
    const range = periodRange({ start: '2025-03-14', end: '2025-03-03' }, [], NOW);
    expect(range?.start).toEqual(keyToDate('2025-03-03'));
    expect(range?.end).toEqual(keyToDate('2025-03-14'));
  });

  it('labels presets by name and custom ranges by their days', () => {
    expect(periodLabel('30d')).toBe('Last 30 days');
    expect(periodLabel({ start: '2025-03-03', end: '2025-03-14' }, 'iso')).toBe(
      '2025-03-03 – 2025-03-14',
    );
  });
});

describe('computeStats — empty diary', () => {
  const periods: StatsPeriod[] = ['30d', '12m', 'year', 'all'];

  it('returns zeros without any entries', () => {
    for (const period of periods) {
      const stats = computeStats([], period, NOW);
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalChars).toBe(0);
      expect(stats.averageChars).toBe(0);
      expect(stats.bestDay).toBeNull();
      expect(stats.ranking).toEqual([]);
    }
  });

  it('still charts the fixed windows when the diary is empty', () => {
    expect(computeStats([], '30d', NOW).timeline.bins).toHaveLength(30);
    expect(computeStats([], '12m', NOW).timeline.bins).toHaveLength(360);
    expect(computeStats([], 'all', NOW).timeline.bins).toEqual([]);
  });

  it('has no best day when every entry is an empty body', () => {
    const stats = computeStats([entry('2026-09-25', '', 'Title only')], 'all', NOW);
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalChars).toBe(0);
    expect(stats.bestDay).toBeNull();
    expect(stats.ranking.map((d) => d.key)).toEqual(['2026-09-25']);
  });
});
