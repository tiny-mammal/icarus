import { describe, expect, it } from 'vitest';
import {
  EMPTY_TRACKER,
  activeHabits,
  addHabit,
  dayRecord,
  habitStreaks,
  importScores,
  nextMark,
  scoreRuns,
  passMark,
  passRun,
  passes,
  renameHabit,
  setHabitArchived,
  setMark,
  setPassMark,
  setPassStreak,
  setScore,
  setScoreScale,
  setStreak,
  scoreOn,
  streakOn,
  trackedDays,
} from '../src/lib/tracker';
import { isBestScore, sunColor } from '../src/lib/sun';
import { addDays, dateKey, keyToDate } from '../src/lib/date';
import type { HabitMark, Tracker } from '../src/lib/types';

const TODAY = '2024-01-10';

/** A tracker with `gym` marked on the given days ('2024-01-DD' → mark). */
function marked(marks: Record<string, HabitMark>, base: Tracker = EMPTY_TRACKER): Tracker {
  return Object.entries(marks).reduce((t, [key, mark]) => setMark(t, key, 'gym', mark), base);
}

function streak(tracker: Tracker, key: string): number {
  return streakOn(tracker, trackedDays(tracker), 'gym', key, TODAY);
}

describe('streakOn', () => {
  it('counts consecutive days marked done', () => {
    const t = marked({ '2024-01-08': 'done', '2024-01-09': 'done', '2024-01-10': 'done' });
    expect(streak(t, '2024-01-10')).toBe(3);
    expect(streak(t, '2024-01-08')).toBe(1);
  });

  it('ends on a day marked missed', () => {
    const t = marked({ '2024-01-07': 'done', '2024-01-08': 'missed', '2024-01-09': 'done' });
    expect(streak(t, '2024-01-09')).toBe(1);
    expect(streak(t, '2024-01-08')).toBe(0);
  });

  it('pauses over unmarked days by default', () => {
    const t = marked({ '2024-01-02': 'done', '2024-01-05': 'done' });
    expect(streak(t, '2024-01-05')).toBe(2);
    expect(streak(t, '2024-01-04')).toBe(1);
  });

  it('ends on an unmarked day when set to, except today', () => {
    const t = marked({ '2024-01-02': 'done', '2024-01-05': 'done', '2024-01-09': 'done' }, {
      ...EMPTY_TRACKER,
      unmarkedDays: 'end',
    });
    expect(streak(t, '2024-01-05')).toBe(1);
    expect(streak(t, '2024-01-04')).toBe(0);
    // Today isn't over yet: it shows the streak it can still extend.
    expect(streak(t, TODAY)).toBe(1);
  });

  it('counts on from a length set by hand', () => {
    let t = marked({ '2024-01-01': 'done', '2024-01-08': 'done', '2024-01-09': 'done' });
    t = setStreak(t, '2024-01-08', 'gym', 45);
    expect(streak(t, '2024-01-08')).toBe(45);
    expect(streak(t, '2024-01-09')).toBe(46);
    expect(streak(t, '2024-01-07')).toBe(1);
    expect(streak(setStreak(t, '2024-01-08', 'gym', null), '2024-01-09')).toBe(3);
  });

  it('keeps habits apart', () => {
    const t = setMark(marked({ '2024-01-09': 'done' }), '2024-01-09', 'read', 'missed');
    expect(streak(t, '2024-01-09')).toBe(1);
    expect(streakOn(t, trackedDays(t), 'read', '2024-01-09', TODAY)).toBe(0);
  });
});

describe('editing the tracker', () => {
  it('cycles a mark through done, missed and none', () => {
    expect(nextMark(undefined)).toBe('done');
    expect(nextMark('done')).toBe('missed');
    expect(nextMark('missed')).toBeUndefined();
  });

  it('drops a day once nothing is tracked on it', () => {
    let t = setScore(EMPTY_TRACKER, '2024-01-01', 7);
    expect(dayRecord(t, '2024-01-01').score).toEqual({ value: 7, scale: 10 });
    t = setMark(t, '2024-01-01', 'gym', 'done');
    t = setScore(t, '2024-01-01', null);
    t = setMark(t, '2024-01-01', 'gym', undefined);
    expect(t.days.size).toBe(0);
  });

  it('scores on the current scale', () => {
    const t = setScore({ ...EMPTY_TRACKER, scoreScale: 5 }, '2024-01-01', 4);
    expect(dayRecord(t, '2024-01-01').score).toEqual({ value: 4, scale: 5 });
  });

  it('adds, renames and archives habits', () => {
    let t = addHabit(EMPTY_TRACKER, '  Gym ');
    t = addHabit(t, '   ');
    expect(t.habits.map((h) => h.name)).toEqual(['Gym']);
    const id = t.habits[0].id;
    t = renameHabit(t, id, 'Running');
    expect(t.habits[0].name).toBe('Running');
    expect(renameHabit(t, id, ' ').habits[0].name).toBe('Running');
    t = setHabitArchived(t, id, true);
    expect(activeHabits(t)).toEqual([]);
    expect(setHabitArchived(t, id, false).habits[0]).toEqual({ id, name: 'Running' });
  });
});

describe('sunColor', () => {
  it('rises from dusk to noon, on any scale', () => {
    expect(sunColor({ value: 1, scale: 10 })).toBe('rgb(125, 90, 85)');
    expect(sunColor({ value: 10, scale: 10 })).toBe('rgb(255, 225, 154)');
    expect(sunColor({ value: 3, scale: 5 })).toBe(sunColor({ value: 5.5, scale: 10 }));
    expect(sunColor({ value: 10, scale: 10 }, 0.5)).toBe('rgba(255, 225, 154, 0.5)');
  });

  it('knows the best score of each scale', () => {
    expect(isBestScore({ value: 10, scale: 10 })).toBe(true);
    expect(isBestScore({ value: 5, scale: 5 })).toBe(true);
    expect(isBestScore({ value: 9, scale: 10 })).toBe(false);
  });
});

describe('passRun', () => {
  /** A tracker with the given scores ('2024-01-DD' → score out of 10). */
  function scored(scores: Record<string, number>, base: Tracker = EMPTY_TRACKER): Tracker {
    return Object.entries(scores).reduce((t, [key, value]) => setScore(t, key, value), base);
  }
  const run = (t: Tracker, key: string) => passRun(t, trackedDays(t), key, TODAY);

  it('counts days in a row on the same side of the pass mark', () => {
    const t = scored({ '2024-01-06': 2, '2024-01-07': 5, '2024-01-08': 9, '2024-01-09': 6 });
    expect(run(t, '2024-01-09')).toEqual({ passed: true, length: 3 });
    expect(run(t, '2024-01-06')).toEqual({ passed: false, length: 1 });
  });

  it('follows the unmarked days rule, without holding today against it', () => {
    const pause = scored({ '2024-01-05': 7, '2024-01-08': 8 });
    expect(run(pause, '2024-01-08')).toEqual({ passed: true, length: 2 });
    const end = { ...pause, unmarkedDays: 'end' as const };
    expect(run(end, '2024-01-08')).toEqual({ passed: true, length: 1 });
    expect(run(end, '2024-01-07')).toBeNull();
    const yesterday = scored({ '2024-01-08': 3, '2024-01-09': 4 }, { ...EMPTY_TRACKER, unmarkedDays: 'end' });
    expect(run(yesterday, TODAY)).toEqual({ passed: false, length: 2 });
  });

  it('uses the pass mark, and judges other scales by their own', () => {
    let t = setPassMark(scored({ '2024-01-08': 6, '2024-01-09': 5 }), 6);
    expect(run(t, '2024-01-09')).toEqual({ passed: false, length: 1 });
    t = setScoreScale(t, 5);
    expect(passMark(t)).toBe(3);
    expect(passes(t, { value: 6, scale: 10 })).toBe(true);
    expect(passes(t, { value: 2, scale: 5 })).toBe(false);
  });

  it('keeps a moved pass mark within the choices of the new scale', () => {
    expect(passMark(setScoreScale(setPassMark(EMPTY_TRACKER, 2), 5))).toBe(2);
    expect(passMark(setScoreScale(setPassMark(EMPTY_TRACKER, 10), 5))).toBe(5);
    expect(setScoreScale(setPassMark(EMPTY_TRACKER, 6), 5).passMark).toBeUndefined();
  });

  it('defaults the pass mark to half the scale', () => {
    expect(passMark(EMPTY_TRACKER)).toBe(5);
    expect(passMark(setScoreScale(EMPTY_TRACKER, 5))).toBe(3);
    expect(setPassMark(setPassMark(EMPTY_TRACKER, 7), 5).passMark).toBeUndefined();
  });

  it('is off when the pass streak is', () => {
    const t = setPassStreak(scored({ '2024-01-09': 8 }), false);
    expect(run(t, '2024-01-09')).toBeNull();
  });
});

describe('habitStreaks', () => {
  const history = (tracker: Tracker) => habitStreaks(tracker, trackedDays(tracker), 'gym', TODAY);

  it('has no streak without marks', () => {
    expect(history(EMPTY_TRACKER)).toEqual({ current: 0, best: null });
  });

  it('finds the longest streak even when it is over', () => {
    const t = marked({
      '2024-01-01': 'done',
      '2024-01-02': 'done',
      '2024-01-03': 'done',
      '2024-01-04': 'missed',
      '2024-01-09': 'done',
      '2024-01-10': 'done',
    });
    expect(history(t)).toEqual({
      current: 2,
      best: { length: 3, start: '2024-01-01', end: '2024-01-03' },
    });
  });

  it('keeps the earliest of two streaks as long as each other', () => {
    const t = marked({ '2024-01-01': 'done', '2024-01-02': 'missed', '2024-01-03': 'done' });
    expect(history(t).best).toEqual({ length: 1, start: '2024-01-01', end: '2024-01-01' });
  });

  it('takes a length set by hand as the start and counts on from it', () => {
    const t = setStreak(marked({ '2024-01-06': 'done', '2024-01-07': 'done' }), '2024-01-05', 'gym', 40);
    expect(history(t)).toEqual({
      current: 42,
      best: { length: 42, start: '2024-01-05', end: '2024-01-07' },
    });
  });

  it('ignores days after today', () => {
    const t = marked({ '2024-01-10': 'done', '2024-01-11': 'done', '2024-01-12': 'done' });
    expect(history(t).current).toBe(1);
    expect(history(t).best?.end).toBe('2024-01-10');
  });

  it('ends the current streak once a day goes unmarked when set to, but not today', () => {
    const base = { ...EMPTY_TRACKER, unmarkedDays: 'end' as const };
    expect(history(marked({ '2024-01-09': 'done' }, base)).current).toBe(1); // today still open
    expect(history(marked({ '2024-01-08': 'done' }, base)).current).toBe(0); // the 9th went unmarked
    expect(history(marked({ '2024-01-08': 'done' }, base)).best?.length).toBe(1);
  });

  it('agrees with counting back from every day, whatever the rules', () => {
    // Deterministic pseudo-random diaries: marks, misses, gaps and hand-set lengths.
    let seed = 20240110;
    const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const first = keyToDate('2023-11-01');
    for (let round = 0; round < 60; round++) {
      let tracker: Tracker = {
        ...EMPTY_TRACKER,
        unmarkedDays: round % 2 ? 'end' : 'pause',
      };
      for (let i = 0; i < 80; i++) {
        const key = dateKey(addDays(first, i));
        const roll = random();
        if (roll < 0.45) tracker = setMark(tracker, key, 'gym', 'done');
        else if (roll < 0.55) tracker = setMark(tracker, key, 'gym', 'missed');
        else if (roll < 0.58) tracker = setStreak(tracker, key, 'gym', Math.floor(random() * 30));
      }
      const days = trackedDays(tracker);
      const counted = days.filter((key) => key <= TODAY).map((key) => streakOn(tracker, days, 'gym', key, TODAY));
      const { current, best } = habitStreaks(tracker, days, 'gym', TODAY);
      expect(current, `current, round ${round}`).toBe(streakOn(tracker, days, 'gym', TODAY, TODAY));
      expect(best?.length ?? 0, `best, round ${round}`).toBe(Math.max(0, ...counted));
    }
  });
});

describe('scoreRuns', () => {
  it('finds the longest run of days that passed', () => {
    const scores: Record<string, number> = {
      '2024-01-01': 8,
      '2024-01-02': 7,
      '2024-01-03': 9,
      '2024-01-04': 2,
      '2024-01-05': 6,
      '2024-01-06': 6,
    };
    const t = Object.entries(scores).reduce((tracker, [key, value]) => setScore(tracker, key, value), EMPTY_TRACKER);
    expect(scoreRuns(t, trackedDays(t), TODAY, true)).toEqual({
      current: 2,
      best: { length: 3, start: '2024-01-01', end: '2024-01-03' },
    });
  });
});

describe('scoreOn', () => {
  it('keeps a score at the same height on another scale', () => {
    expect(scoreOn({ value: 10, scale: 10 }, 5)).toBe(5);
    expect(scoreOn({ value: 1, scale: 10 }, 5)).toBe(1);
    expect(scoreOn({ value: 3, scale: 5 }, 5)).toBe(3);
    expect(scoreOn({ value: 5, scale: 5 }, 10)).toBe(10);
  });
});

describe('importScores', () => {
  it('scores many days at once, each on the scale it was given on', () => {
    const fiveScale = { ...EMPTY_TRACKER, scoreScale: 5 };
    const t = importScores(
      fiveScale,
      new Map([
        ['2024-01-01', { value: 8, scale: 10 }],
        ['2024-01-02', { value: 3, scale: 5 }],
      ]),
    );
    expect(dayRecord(t, '2024-01-01').score).toEqual({ value: 8, scale: 10 });
    expect(dayRecord(t, '2024-01-02').score).toEqual({ value: 3, scale: 5 });
    expect(t.scoreScale).toBe(5);
  });

  it('keeps what else a day holds, and replaces its score', () => {
    const marked = setScore(marked_('2024-01-01'), '2024-01-01', 4);
    const t = importScores(marked, new Map([['2024-01-01', { value: 9, scale: 10 }]]));
    expect(dayRecord(t, '2024-01-01')).toMatchObject({ score: { value: 9, scale: 10 }, marks: { gym: 'done' } });
  });

  it('leaves the tracker as it was with nothing to import', () => {
    expect(importScores(EMPTY_TRACKER, new Map())).toBe(EMPTY_TRACKER);
  });

  it('does not touch the tracker it is given', () => {
    const before = new Map(EMPTY_TRACKER.days);
    importScores(EMPTY_TRACKER, new Map([['2024-01-01', { value: 5, scale: 10 }]]));
    expect(EMPTY_TRACKER.days).toEqual(before);
  });
});

function marked_(key: string): Tracker {
  return marked({ [key]: 'done' });
}
