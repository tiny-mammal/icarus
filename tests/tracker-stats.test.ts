import { describe, expect, it } from 'vitest';
import { RECENT_DAYS, computeTrackerStats, hasTracking } from '../src/lib/tracker-stats';
import {
  EMPTY_TRACKER,
  setHabitArchived,
  setMark,
  setPassStreak,
  setScore,
  setScoreScale,
} from '../src/lib/tracker';
import { addDays, dateKey } from '../src/lib/date';
import type { HabitMark, Tracker } from '../src/lib/types';

const NOW = new Date(2026, 8, 25); // 25 Sep 2026

/** The key of the day `ago` days before NOW. */
const key = (ago: number) => dateKey(addDays(NOW, -ago));

const HABITS: Tracker = {
  ...EMPTY_TRACKER,
  habits: [
    { id: 'run', name: 'Run' },
    { id: 'read', name: 'Read' },
  ],
};

/** Mark `habit` on each of the days `ago` days back. */
function mark(tracker: Tracker, habit: string, marks: Record<number, HabitMark>): Tracker {
  return Object.entries(marks).reduce((t, [ago, m]) => setMark(t, key(Number(ago)), habit, m), tracker);
}

/** Score the days `ago` days back. */
function score(tracker: Tracker, scores: Record<number, number>): Tracker {
  return Object.entries(scores).reduce((t, [ago, value]) => setScore(t, key(Number(ago)), value), tracker);
}

const habit = (tracker: Tracker, id: string, period: Parameters<typeof computeTrackerStats>[1] = 'all') =>
  computeTrackerStats(tracker, period, NOW).habits.find((h) => h.habit.id === id)!;

describe('hasTracking', () => {
  it('is false for a diary that never tracked anything', () => {
    expect(hasTracking(EMPTY_TRACKER)).toBe(false);
    expect(hasTracking(HABITS)).toBe(true);
    expect(hasTracking(score(EMPTY_TRACKER, { 0: 5 }))).toBe(true);
  });
});

describe('computeTrackerStats — nothing tracked', () => {
  it('is empty with nothing to chart', () => {
    const stats = computeTrackerStats(EMPTY_TRACKER, 'all', NOW);
    expect(stats.empty).toBe(true);
    expect(stats.habits).toEqual([]);
    expect(stats.score.scored).toBe(0);
    expect(stats.score.average).toBeNull();
    expect(stats.score.timeline.bins).toEqual([]);
  });

  it('is empty for a period without days, though earlier ones had some', () => {
    const t = score(HABITS, { 100: 8 });
    const stats = computeTrackerStats(t, '30d', NOW);
    expect(stats.empty).toBe(true);
    expect(stats.score.timeline.bins.length).toBe(30);
  });
});

describe('computeTrackerStats — scores', () => {
  const scored = score(EMPTY_TRACKER, { 0: 8, 1: 7, 2: 9, 3: 2, 4: 6 });

  it('averages, counts the days that passed and tallies each score', () => {
    const { score: s } = computeTrackerStats(scored, '30d', NOW);
    expect(s.scored).toBe(5);
    expect(s.average).toBeCloseTo(6.4);
    expect(s.passed).toBe(4); // the pass mark is 5 on a scale of 10
    expect(s.passRate).toBeCloseTo(0.8);
    expect(s.distribution).toEqual([0, 1, 0, 0, 0, 1, 1, 1, 1, 0]);
  });

  it('only counts the days of the period', () => {
    const t = score(scored, { 60: 1, 61: 1 });
    expect(computeTrackerStats(t, '30d', NOW).score.scored).toBe(5);
    expect(computeTrackerStats(t, 'all', NOW).score.scored).toBe(7);
  });

  it('judges scores given on another scale by their height', () => {
    // 5 of 5 then 1 of 5, now measured on a scale of 10.
    const t = setScoreScale(score(EMPTY_TRACKER, { 1: 5, 0: 1 }), 10);
    const s = computeTrackerStats(
      { ...t, days: new Map([...t.days].map(([k, r]) => [k, { ...r, score: { value: r.score!.value, scale: 5 } }])) },
      '30d',
      NOW,
    ).score;
    expect(s.average).toBe(5.5);
    expect(s.distribution[9]).toBe(1);
    expect(s.distribution[0]).toBe(1);
    expect(s.passed).toBe(1);
  });

  it('charts the average score, with no bar on days without one', () => {
    const { timeline } = computeTrackerStats(scored, '30d', NOW).score;
    expect(timeline.bins.at(-1)).toMatchObject({ key: key(0), value: 8, count: 1 });
    expect(timeline.bins.at(-10)).toMatchObject({ count: 0, value: 0 });
  });

  it('follows the run of days that passed, and the longest ever', () => {
    const { run, best } = computeTrackerStats(scored, '30d', NOW).score;
    expect(run).toEqual({ passed: true, length: 3 });
    expect(best).toEqual({ length: 3, start: key(2), end: key(0) });
  });

  it('keeps the longest run beyond the period', () => {
    const long = score(EMPTY_TRACKER, Object.fromEntries(Array.from({ length: 50 }, (_, i) => [100 + i, 8])));
    // A failed day in between, so today starts a run of its own.
    const { best, run } = computeTrackerStats(score(long, { 50: 1, 0: 8 }), '30d', NOW).score;
    expect(best?.length).toBe(50);
    expect(run).toEqual({ passed: true, length: 1 });
  });

  it('finds the worst run across the whole history, including an ongoing one', () => {
    const t = score(EMPTY_TRACKER, { 200: 2, 199: 1, 198: 3, 100: 8, 2: 1, 0: 2 });
    const { worst, run } = computeTrackerStats(t, '30d', NOW).score;
    expect(worst).toEqual({ length: 3, start: key(200), end: key(198) });
    expect(run).toEqual({ passed: false, length: 2 });

    const ongoing = computeTrackerStats(score(t, { 1: 3, 3: 1 }), '30d', NOW).score;
    expect(ongoing.worst).toEqual({ length: 4, start: key(3), end: key(0) });
    expect(ongoing.run).toEqual({ passed: false, length: 4 });
  });

  it('applies the unmarked-days rule to failing runs and ignores future scores', () => {
    const t = score(EMPTY_TRACKER, { 5: 2, 3: 1, 2: 3, 0: 8, [-1]: 1, [-2]: 1, [-3]: 1 });
    expect(computeTrackerStats(t, 'all', NOW).score.worst)
      .toEqual({ length: 3, start: key(5), end: key(2) });
    expect(computeTrackerStats({ ...t, unmarkedDays: 'end' }, 'all', NOW).score.worst)
      .toEqual({ length: 2, start: key(3), end: key(2) });
  });

  it('has no worst run without failing scores', () => {
    expect(computeTrackerStats(score(EMPTY_TRACKER, { 0: 8, 1: 5 }), 'all', NOW).score.worst).toBeNull();
    expect(computeTrackerStats(EMPTY_TRACKER, 'all', NOW).score.worst).toBeNull();
  });

  it('leaves runs out when the pass streak is off', () => {
    const { run, best, worst } = computeTrackerStats(setPassStreak(scored, false), '30d', NOW).score;
    expect(run).toBeNull();
    expect(best).toBeNull();
    expect(worst).toBeNull();
  });
});

describe('computeTrackerStats — habits', () => {
  it('keeps a streak whole when the period cuts it short', () => {
    // Done every day from 49 days ago to today: the last 30 days are only part of it.
    const t = mark(HABITS, 'run', Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i, 'done' as const])));
    const stats = habit(t, 'run', '30d');
    expect(stats.current).toBe(50);
    expect(stats.best).toEqual({ length: 50, start: key(49), end: key(0) });
    expect(stats.done).toBe(30);
  });

  it('finds a longest streak that ended long ago', () => {
    const t = mark(HABITS, 'run', { 200: 'done', 199: 'done', 198: 'done', 197: 'missed', 0: 'done' });
    const stats = habit(t, 'run', '30d');
    expect(stats.current).toBe(1);
    expect(stats.best).toEqual({ length: 3, start: key(200), end: key(198) });
    expect(stats.done).toBe(1);
    expect(stats.missed).toBe(0);
  });

  it('rates the days marked done out of the days marked, by default', () => {
    const t = mark(HABITS, 'run', { 0: 'done', 1: 'done', 2: 'missed', 3: 'done', 10: 'missed' });
    const stats = habit(t, 'run');
    expect(stats).toMatchObject({ done: 3, missed: 2, counted: 5, since: key(10) });
    expect(stats.rate).toBeCloseTo(0.6);
  });

  it('counts unmarked days against the rate when they end a streak, but not today', () => {
    const t = mark({ ...HABITS, unmarkedDays: 'end' }, 'run', { 5: 'done', 4: 'done', 2: 'done' });
    // Days 5 to 1 ago: three done, two unmarked; today is still open.
    expect(habit(t, 'run')).toMatchObject({ done: 3, counted: 5 });
    expect(habit(t, 'run').rate).toBeCloseTo(0.6);
    // Marked today, it counts like any other day.
    expect(habit(mark(t, 'run', { 0: 'done' }), 'run')).toMatchObject({ done: 4, counted: 6 });
  });

  it('starts counting a habit from its first mark, not from the period start', () => {
    const t = mark({ ...HABITS, unmarkedDays: 'end' }, 'run', { 3: 'done', 2: 'done', 1: 'done', 0: 'done' });
    expect(habit(t, 'run', 'year')).toMatchObject({ done: 4, counted: 4, rate: 1 });
  });

  it('has no rate for a habit nobody marked', () => {
    expect(habit(score(HABITS, { 0: 5 }), 'read')).toMatchObject({ current: 0, best: null, rate: null, since: null });
  });

  it('lists the last days of marks up to today', () => {
    const t = mark(HABITS, 'run', { 0: 'done', 1: 'missed', 29: 'done', 30: 'done' });
    const { recent } = habit(t, 'run');
    expect(recent).toHaveLength(RECENT_DAYS);
    expect(recent.at(-1)).toBe('done');
    expect(recent.at(-2)).toBe('missed');
    expect(recent[0]).toBe('done'); // 29 days ago
    expect(recent[5]).toBeUndefined();
  });

  it('orders active habits by streak and puts archived ones last', () => {
    let t = mark(HABITS, 'read', { 0: 'done', 1: 'done' });
    t = mark(t, 'run', { 0: 'done' });
    t = { ...t, habits: [...t.habits, { id: 'old', name: 'Old', archived: true }, { id: 'unused', name: 'Unused', archived: true }] };
    t = mark(t, 'old', { 0: 'done', 1: 'done', 2: 'done' });
    const names = computeTrackerStats(t, 'all', NOW).habits.map((h) => h.habit.name);
    // 'Unused' was archived without ever being marked, so there is nothing to show.
    expect(names).toEqual(['Read', 'Run', 'Old']);
  });

  it('shows an archived habit that was marked, flagged as archived', () => {
    const t = setHabitArchived(mark(HABITS, 'run', { 0: 'done' }), 'run', true);
    expect(habit(t, 'run').habit.archived).toBe(true);
  });
});
