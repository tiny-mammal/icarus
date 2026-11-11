/**
 * Day tracking: a score for each day and daily habits whose streaks are
 * counted from the marks. Pure functions over the immutable {@link Tracker};
 * the store keeps one and swaps it for the result of each change.
 */
import { addDays, dateKey, keyToDate } from './date';
import { randomId } from './random';
import type { DayRecord, DayScore, Habit, HabitMark, Tracker, UnmarkedDays } from './types';

export const SCORE_SCALES = [10, 5] as const;
export const DEFAULT_SCORE_SCALE = 10;
export const DEFAULT_UNMARKED_DAYS: UnmarkedDays = 'pause';

export const EMPTY_TRACKER: Tracker = {
  habits: [],
  days: new Map(),
  scoreScale: DEFAULT_SCORE_SCALE,
  unmarkedDays: DEFAULT_UNMARKED_DAYS,
  passStreak: true,
};

const EMPTY_DAY: DayRecord = { marks: {}, streaks: {} };

/** Whether a record holds nothing worth keeping. */
function isEmpty(record: DayRecord): boolean {
  return (
    !record.score &&
    !record.extra &&
    Object.keys(record.marks).length === 0 &&
    Object.keys(record.streaks).length === 0
  );
}

/** The record for `key`, or an empty one. */
export function dayRecord(tracker: Tracker, key: string): DayRecord {
  return tracker.days.get(key) ?? EMPTY_DAY;
}

/** Replace the record for `key` with `update(current)`, dropping it once empty. */
function updateDay(tracker: Tracker, key: string, update: (record: DayRecord) => DayRecord): Tracker {
  const next = update(dayRecord(tracker, key));
  const days = new Map(tracker.days);
  if (isEmpty(next)) days.delete(key);
  else days.set(key, next);
  return { ...tracker, days };
}

/** A copy of `map` with `id` set to `value`, or removed when it is undefined. */
function withKey<T>(map: Readonly<Record<string, T>>, id: string, value: T | undefined): Record<string, T> {
  const next = { ...map };
  if (value === undefined) delete next[id];
  else next[id] = value;
  return next;
}

// --- scores -------------------------------------------------------------------

/** Score the day on the current scale, or clear its score with `null`. */
export function setScore(tracker: Tracker, key: string, value: number | null): Tracker {
  return updateDay(tracker, key, (record) => {
    const { score: _, ...rest } = record;
    return value === null ? rest : { ...rest, score: { value, scale: tracker.scoreScale } };
  });
}

// --- habits -------------------------------------------------------------------

/** Habits shown on each day, in order. */
export function activeHabits(tracker: Tracker): Habit[] {
  return tracker.habits.filter((habit) => !habit.archived);
}

export function addHabit(tracker: Tracker, name: string): Tracker {
  const trimmed = name.trim();
  if (!trimmed) return tracker;
  return { ...tracker, habits: [...tracker.habits, { id: randomId(), name: trimmed }] };
}

function updateHabit(tracker: Tracker, id: string, patch: Partial<Habit>): Tracker {
  return {
    ...tracker,
    habits: tracker.habits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
  };
}

export function renameHabit(tracker: Tracker, id: string, name: string): Tracker {
  const trimmed = name.trim();
  return trimmed ? updateHabit(tracker, id, { name: trimmed }) : tracker;
}

/** Archive a habit (it keeps its history) or bring it back. */
export function setHabitArchived(tracker: Tracker, id: string, archived: boolean): Tracker {
  return updateHabit(tracker, id, { archived: archived || undefined });
}

/** The mark after `mark` when it is tapped: none → done → missed → none. */
export function nextMark(mark: HabitMark | undefined): HabitMark | undefined {
  return mark === undefined ? 'done' : mark === 'done' ? 'missed' : undefined;
}

export function setMark(tracker: Tracker, key: string, habitId: string, mark: HabitMark | undefined): Tracker {
  return updateDay(tracker, key, (record) => ({ ...record, marks: withKey(record.marks, habitId, mark) }));
}

/**
 * Set the streak a habit had on a day by hand, or go back to counting it with
 * `null`. Later days count on from it.
 */
export function setStreak(tracker: Tracker, key: string, habitId: string, length: number | null): Tracker {
  const value = length === null ? undefined : Math.max(0, Math.floor(length));
  return updateDay(tracker, key, (record) => ({ ...record, streaks: withKey(record.streaks, habitId, value) }));
}

// --- streaks ------------------------------------------------------------------

/** The day keys that have a record, oldest first. Shared by every streak lookup. */
export function trackedDays(tracker: Tracker): string[] {
  return [...tracker.days.keys()].sort();
}

/** Index of the last key in sorted `keys` that is not after `key`, or -1. */
function lastIndexAtOrBefore(keys: readonly string[], key: string): number {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid] <= key) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

const dayBefore = (key: string) => dateKey(addDays(keyToDate(key), -1));

/**
 * What one day does to a streak being counted back: adds a day ('count'),
 * ends it ('stop'), or sets its length by hand (a number, taken as is with
 * the days after counting on from it). Undefined when the day says nothing
 * about it.
 */
type DayStep = 'count' | 'stop' | number | undefined;

/**
 * Count a streak back from day `key`, one tracked day at a time. Days that
 * say nothing about it pause the streak, or end it when `unmarkedDays` is
 * 'end'; today is never held against it, since it can still be marked.
 *
 * `days` is {@link trackedDays} for the same tracker.
 */
function countBack(
  tracker: Tracker,
  days: readonly string[],
  key: string,
  todayKey: string,
  step: (record: DayRecord) => DayStep,
): number {
  const ends = tracker.unmarkedDays === 'end';
  // In 'end' mode, the next day back that must be marked for the streak to go on.
  let expected = key;
  if (step(dayRecord(tracker, key)) === undefined) {
    if (ends && key < todayKey) return 0;
    expected = dayBefore(key);
  }
  let length = 0;
  for (let i = lastIndexAtOrBefore(days, key); i >= 0; i--) {
    const day = days[i];
    const result = step(tracker.days.get(day)!);
    if (result === undefined) continue;
    if (ends && day !== expected) break;
    if (typeof result === 'number') return length + result;
    if (result === 'stop') break;
    length++;
    expected = dayBefore(day);
  }
  return length;
}

/**
 * How long a habit's streak was on day `key`: each day marked done adds one,
 * a day marked missed ends it, and a length set by hand is taken as is.
 */
export function streakOn(
  tracker: Tracker,
  days: readonly string[],
  habitId: string,
  key: string,
  todayKey: string,
): number {
  return countBack(tracker, days, key, todayKey, (record) => {
    const set = record.streaks[habitId];
    if (set !== undefined) return set;
    const mark = record.marks[habitId];
    return mark === 'done' ? 'count' : mark === 'missed' ? 'stop' : undefined;
  });
}

// --- passing and failing ------------------------------------------------------

/** The lowest score that passes, on the current scale: half of it unless set. */
export function passMark(tracker: Tracker): number {
  return tracker.passMark ?? Math.ceil(tracker.scoreScale / 2);
}

/** How far up its scale a score is, from 0 (the lowest) to 1 (the best). */
export function scoreLevel(value: number, scale: number): number {
  return (value - 1) / Math.max(1, scale - 1);
}

/** Whether `score` passes. A score given on another scale is judged by its level on it. */
export function passes(tracker: Tracker, score: DayScore): boolean {
  return scoreLevel(score.value, score.scale) >= scoreLevel(passMark(tracker), tracker.scoreScale) - 1e-9;
}

/**
 * The run of days in a row that passed, or that failed, up to day `key`: the
 * side of the last scored day, and how many days in a row it held. Days with
 * no score follow the habits' rule for unmarked days. Null with the pass
 * streak turned off or nothing scored yet.
 */
export function passRun(
  tracker: Tracker,
  days: readonly string[],
  key: string,
  todayKey: string,
): { passed: boolean; length: number } | null {
  if (!tracker.passStreak) return null;
  let side: boolean | undefined;
  const length = countBack(tracker, days, key, todayKey, (record) => {
    if (!record.score) return undefined;
    const passed = passes(tracker, record.score);
    side ??= passed;
    return passed === side ? 'count' : 'stop';
  });
  return side === undefined || length === 0 ? null : { passed: side, length };
}

// --- settings -----------------------------------------------------------------

/**
 * Change the score scale. A pass mark set by hand moves to the same height on
 * the new scale; scores already given keep the scale they were given on.
 */
export function setScoreScale(tracker: Tracker, scale: number): Tracker {
  if (scale === tracker.scoreScale) return tracker;
  const scaled = { ...tracker, scoreScale: scale, passMark: undefined };
  if (tracker.passMark === undefined) return scaled;
  return setPassMark(scaled, 1 + scoreLevel(tracker.passMark, tracker.scoreScale) * (scale - 1));
}

export function setPassMark(tracker: Tracker, mark: number): Tracker {
  const clamped = Math.min(tracker.scoreScale, Math.max(2, Math.round(mark)));
  if (clamped === passMark(tracker)) return tracker;
  return { ...tracker, passMark: clamped === Math.ceil(tracker.scoreScale / 2) ? undefined : clamped };
}

export function setPassStreak(tracker: Tracker, on: boolean): Tracker {
  return on === tracker.passStreak ? tracker : { ...tracker, passStreak: on };
}

export function setUnmarkedDays(tracker: Tracker, rule: UnmarkedDays): Tracker {
  return rule === tracker.unmarkedDays ? tracker : { ...tracker, unmarkedDays: rule };
}
