import { describe, expect, it } from 'vitest';
import {
  EMPTY_TRACKER,
  activeHabits,
  addHabit,
  dayRecord,
  nextMark,
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
  streakOn,
  trackedDays,
} from '../src/lib/tracker';
import { isBestScore, sunColor } from '../src/lib/sun';
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
