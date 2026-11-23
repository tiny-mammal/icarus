import { plural } from '../../format';

/** The statistics dialog: writing, tracking, the charts and the periods. */
export default {
  title: 'Statistics',
  viewLabel: 'Statistics view',
  views: { writing: 'Writing', tracking: 'Tracking' },

  periodLabel: 'Statistics period',
  periods: {
    last30Days: 'Last 30 days',
    lastYear: 'Last year',
    thisYear: 'This year',
    allTime: 'All time',
    custom: 'Custom range…',
    /** The heading of the calendar that replaces the list of periods. */
    customPanel: 'Custom range',
  },

  /** A unit set in a quieter tone beside a number, like “5 days”. */
  dayUnit: plural({ one: 'day', other: 'days' }),
  characters: plural({ one: '{count} character', other: '{count} characters' }),
  /** A moving average over the last `{count}` days, as in “7-day average”. */
  movingAverage: plural({ one: '{count}-day average', other: '{count}-day average' }),

  chart: {
    /** The legend entry for the bars: one bar per day, week or month. */
    barsDaily: 'Daily',
    barsWeekly: 'Weekly',
    barsMonthly: 'Monthly',
    /** Weekly and monthly bars show an amount per day, not a total. */
    barsWeeklyPerDay: 'Weekly (per day)',
    barsMonthlyPerDay: 'Monthly (per day)',
  },

  writing: {
    /** A short label above a figure (all capitals): the number of entries. */
    entries: 'Entries',
    characters: 'Characters',
    /** Short for “average entry”: fits a small tile label. */
    averageEntry: 'Avg. entry',
    charactersPerEntry: 'Characters per entry',
    bestDay: 'Best day',

    charactersPerDay: 'Characters per day',
    chartLabel: 'Characters written over the selected period',
    /** `{characters}` is like “1,200 characters”, `{entries}` like “3 entries”. */
    chartTotals: '{characters} · {entries}',
    /** `{value}` is a number of characters; `{count}` is the days the average spans. */
    chartPerDayAverage: plural({
      one: '{value} per day, {count}-day average',
      other: '{value} per day, {count}-day average',
    }),
    noEntries: 'No entries in this period.',
    nothingWritten: 'Nothing written in this period.',

    topDays: 'Top days',
    topDaysHint: 'By characters written',
  },

  tracking: {
    nothingTracked: 'Nothing scored or marked in this period.',

    /** Short for “average score”: fits a small tile label. */
    averageScore: 'Avg. score',
    daysScored: plural({ one: '{count} day scored', other: '{count} days scored' }),
    passingDays: 'Passing days',
    /** `{passed}` of the `{count}` days that were scored. */
    passedOfScored: plural({ one: '{passed} of {count} day', other: '{passed} of {count} days' }),
    currentRun: 'Current run',
    runPassing: 'Passing',
    runFailing: 'Failing',
    runNothingScored: 'Nothing scored yet',
    bestRun: 'Best run',
    worstRun: 'Worst run',
    showWorstRun: 'Show worst run',
    showBestRun: 'Show best run',
    runStillGoing: 'Still going',
    /** `{date}` is a month and year, like “March 2025”. */
    runUntil: 'Until {date}',
    noPassingDay: 'No passing day yet',
    noFailingDay: 'No failing day yet',
    /** The tile as a screen reader reads it; `{action}` says what pressing it does. */
    runTileLabel: '{label}: {value}. {detail}. {action}',

    scoreOverTime: 'Score over time',
    chartLabel: 'Average score over the selected period',
    /** The pass mark's line across the chart; `{score}` is the lowest passing score. */
    passMark: 'Pass mark ({score})',
    /** `{value}` is an average score; `{days}` is like “3 days scored”. */
    chartAverage: '{value} average · {days}',
    chartNoScore: 'No score',
    /** `{value}` is an average score; `{count}` is the days the moving average spans. */
    chartMovingAverage: plural({
      one: '{value}, {count}-day average',
      other: '{value}, {count}-day average',
    }),
    noScoredDays: 'No days scored in this period.',

    scoreDistribution: 'Score distribution',
    /** Also the accessible name of the bars. */
    daysGivenEachScore: 'Days given each score',
    /** One bar of the distribution; `{days}` is like “3 days”. */
    scoreDays: 'Score {value}: {days}',
  },

  habits: {
    title: 'Habits',
    hint: 'Streaks span all time; rates follow the period',
    done: 'Done',
    missed: 'Missed',
    notMarked: 'Not marked',

    noStreakYet: 'No streak yet',
    archived: 'Archived',
    /** `{date}` is the first day the habit was marked, like “3 Mar 2025”. */
    trackedSince: 'Tracked since {date}',
    notMarkedYet: 'Not marked yet',
    /** The tooltip on the streak's number; `{date}` is the day the streak began. */
    streakStarted: 'Streak started: {date}',
    streakStartedEstimated: 'Estimated streak start: {date}',

    current: 'Current',
    best: 'Best',
    noActiveStreak: 'No active streak',
    longestStreak: 'Your longest',
    activeStreak: 'Active streak',
    /** `{done}` of the `{count}` days the habit was counted on. */
    rateOf: plural({ one: '{done} of {count} day', other: '{done} of {count} days' }),
    rateNotMarked: 'Not marked in this period',

    lastDays: plural({ one: 'Last {count} day', other: 'Last {count} days' }),
    /** The strip of recent marks as a screen reader reads it. */
    lastDaysSummary: plural({
      one: 'Last {count} day: {done} done, {missed} missed',
      other: 'Last {count} days: {done} done, {missed} missed',
    }),
  },
};
