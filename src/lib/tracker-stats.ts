/**
 * Tracking statistics: how the day scores and the habits went over a period.
 * Pure aggregation over the {@link Tracker}, like `stats.ts` is for writing,
 * so the statistics modal only has to present it.
 *
 * Streaks are deliberately not bound to the period: a 50-day streak seen
 * through a 30-day window is still 50 days. Rates, averages and charts follow
 * the period.
 */
import { dateKey, daysBetween, addDays, keyToDate, startOfDay, type DateFormat } from './date';
import { diaryDates, periodRange, type StatsPeriod } from './stats';
import { EMPTY_TIMELINE, buildTimeline, type DayTotal, type Timeline } from './timeline';
import {
  habitStreaks,
  habitStreakStart,
  passMark,
  passRun,
  passes,
  scoreRuns,
  scoreOn,
  trackedDays,
  type StreakRun,
} from './tracker';
import type { Habit, HabitMark, Tracker } from './types';

/** How many days the strip of recent marks covers. */
export const RECENT_DAYS = 30;

export interface HabitStats {
  habit: Habit;
  /** The streak as it stands today. */
  current: number;
  currentStart: { day: string; estimated: boolean } | null;
  /** The longest streak the habit ever had. */
  best: StreakRun | null;
  /** Days marked done and missed within the period. */
  done: number;
  missed: number;
  /**
   * The days the rate is out of: those marked, plus, when unmarked days end a
   * streak, the unmarked ones since the habit was first marked.
   */
  counted: number;
  /** `done / counted`, 0 to 1; null when nothing counts. */
  rate: number | null;
  /** The first day the habit was marked, ever. */
  since: string | null;
  /** The last {@link RECENT_DAYS} days up to today, oldest first. */
  recent: (HabitMark | undefined)[];
}

export interface ScoreStats {
  /** The scale everything below is on (the tracker's current one). */
  scale: number;
  passMark: number;
  /** Days with a score within the period. */
  scored: number;
  /** Mean score on `scale`; null when nothing was scored. */
  average: number | null;
  passed: number;
  /** `passed / scored`, 0 to 1; null when nothing was scored. */
  passRate: number | null;
  /** Days given each score, `scale` entries starting at 1. */
  distribution: number[];
  /** Average score over time (no bins when there is nothing to chart). */
  timeline: Timeline;
  /** The run of passing (or failing) days up to today; null with the pass streak off. */
  run: { passed: boolean; length: number } | null;
  /** The longest run of passing days ever; null with the pass streak off. */
  best: StreakRun | null;
  /** The longest run of failing days ever; null with the pass streak off. */
  worst: StreakRun | null;
}

export interface TrackerStats {
  period: StatsPeriod;
  score: ScoreStats;
  /** Active habits first, longest streak first; then archived ones that were ever marked. */
  habits: HabitStats[];
  /** Nothing scored or marked within the period. */
  empty: boolean;
}

const emptyScore = (tracker: Tracker): ScoreStats => ({
  scale: tracker.scoreScale,
  passMark: passMark(tracker),
  scored: 0,
  average: null,
  passed: 0,
  passRate: null,
  distribution: Array.from({ length: tracker.scoreScale }, () => 0),
  timeline: EMPTY_TIMELINE,
  run: null,
  best: null,
  worst: null,
});

/** Whether `tracker` has anything to show statistics of. */
export function hasTracking(tracker: Tracker): boolean {
  return tracker.habits.length > 0 || tracker.days.size > 0;
}

interface HabitTally {
  habit: Habit;
  done: number;
  missed: number;
  since: string | null;
}

/** Aggregate `tracker` for the given period. */
export function computeTrackerStats(
  tracker: Tracker,
  period: StatsPeriod,
  now: Date = new Date(),
  format: DateFormat = 'auto',
): TrackerStats {
  const range = periodRange(period, diaryDates([], tracker), now);
  if (!range) return { period, score: emptyScore(tracker), habits: [], empty: true };

  const todayKey = dateKey(now);
  const startKey = dateKey(range.start);
  const endKey = dateKey(range.end);
  const days = trackedDays(tracker);
  const scale = tracker.scoreScale;

  const tallies: HabitTally[] = tracker.habits.map((habit) => ({ habit, done: 0, missed: 0, since: null }));
  const score = emptyScore(tracker);
  // Every scored day, including those before the range: the chart's moving
  // average looks back past its first bar.
  const totals = new Map<string, DayTotal>();
  let sum = 0;

  for (const key of days) {
    const record = tracker.days.get(key)!;
    const inRange = key >= startKey && key <= endKey;

    if (record.score) {
      const value = scoreOn(record.score, scale);
      totals.set(key, { total: value, count: 1 });
      if (inRange) {
        score.scored++;
        sum += value;
        if (passes(tracker, record.score)) score.passed++;
        score.distribution[Math.min(scale, Math.max(1, Math.round(value))) - 1]++;
      }
    }

    for (const tally of tallies) {
      const mark = record.marks[tally.habit.id];
      if (!mark) continue;
      tally.since ??= key;
      if (!inRange) continue;
      if (mark === 'done') tally.done++;
      else tally.missed++;
    }
  }

  if (score.scored > 0) {
    score.average = sum / score.scored;
    score.passRate = score.passed / score.scored;
  }
  score.timeline = buildTimeline(totals, range.start, range.end, format, 'mean');
  if (tracker.passStreak) {
    score.run = passRun(tracker, days, todayKey, todayKey);
    score.best = scoreRuns(tracker, days, todayKey, true).best;
    score.worst = scoreRuns(tracker, days, todayKey, false).best;
  }

  const recentKeys = Array.from({ length: RECENT_DAYS }, (_, i) =>
    dateKey(addDays(startOfDay(now), i + 1 - RECENT_DAYS)),
  );
  const habits = tallies
    .filter(({ habit, since }) => !habit.archived || since !== null)
    .map<HabitStats>(({ habit, done, missed, since }) => {
      const { current, best } = habitStreaks(tracker, days, habit.id, todayKey);
      const counted = countedDays(tracker, habit.id, { done, missed, since }, startKey, endKey, todayKey);
      return {
        habit,
        current,
        currentStart: habitStreakStart(tracker, days, habit.id, todayKey, current),
        best,
        done,
        missed,
        counted,
        rate: counted > 0 ? done / counted : null,
        since,
        recent: recentKeys.map((key) => tracker.days.get(key)?.marks[habit.id]),
      };
    });

  // Active habits come first; each group keeps the habit list's order among equals.
  const order = (stats: HabitStats) => (stats.habit.archived ? 1 : 0);
  habits.sort((a, b) => order(a) - order(b) || b.current - a.current);

  return {
    period,
    score,
    habits,
    empty: score.scored === 0 && habits.every(({ done, missed }) => done + missed === 0),
  };
}

/**
 * The days a habit's rate is out of. Unmarked days are left out unless they
 * end a streak; then, from the habit's first mark to today, each counts as a
 * day it was not done (today still can be, so it waits).
 */
function countedDays(
  tracker: Tracker,
  habitId: string,
  { done, missed, since }: Pick<HabitTally, 'done' | 'missed' | 'since'>,
  startKey: string,
  endKey: string,
  todayKey: string,
): number {
  const marked = done + missed;
  if (tracker.unmarkedDays !== 'end' || since === null) return marked;
  const from = since > startKey ? since : startKey;
  const to = endKey < todayKey ? endKey : todayKey;
  if (from > to) return marked;
  const span = daysBetween(keyToDate(from), keyToDate(to)) + 1;
  const waiting = to === todayKey && !tracker.days.get(todayKey)?.marks[habitId] ? 1 : 0;
  return Math.max(marked, span - waiting);
}
