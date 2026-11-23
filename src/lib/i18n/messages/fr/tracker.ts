import { plural } from '../../format';

/** The day's score and habits, and the temporary import of old scores. */
export default {
  scoreAndHabits: 'Score and habits',
  /** The tooltip on the day's summary; `{run}` is like “Passed 3 days in a row”. */
  scoreAndHabitsWithRun: 'Score and habits · {run}',
  /** The summary as a screen reader reads it; `{summary}` is the parts below, joined. */
  summaryLabel: '{summary}. Score and habits',
  scoreTheDay: 'Score the day',

  /** `{value}` is the score given, out of `{scale}` (the highest score). */
  scoreOf: '{value} of {scale}',
  scoreSummary: 'Score {value} of {scale}',
  scoreOldScale: '{value} of {scale} on the old scale',
  notScored: 'Not scored',
  /** `{count}` days of a run in a row. */
  runPassed: plural({ one: 'Passed {count} day in a row', other: 'Passed {count} days in a row' }),
  runFailed: plural({ one: 'Failed {count} day in a row', other: 'Failed {count} days in a row' }),
  /** `{done}` of the `{count}` active habits are marked done. */
  habitsDone: plural({ one: '{done} of {count} habit done', other: '{done} of {count} habits done' }),

  score: 'Score',
  /** The score's choices as a screen reader reads them: `{step}` of `{scale}`. */
  scoreStep: '{step} of {scale}',

  habits: 'Habits',
  editHabits: 'Edit habits',
  habitsEmpty: 'Track something every day and see how long you keep it up.',
  addHabitPlaceholder: 'Add a habit',
  newHabit: 'New habit',

  /** The mark a habit has on a day, and the one a tap moves it to. */
  markDone: 'done',
  markMissed: 'missed',
  markNone: 'not marked',
  /** `{state}` and `{next}` are the words above: the mark now and the one a tap sets. */
  markLabel: '{habit}: {state}. Mark as {next}',

  /** `{days}` is like “5 days”. */
  streakLabel: 'Streak for {habit}: {days}. Change it',
  streakLabelByHand: 'Streak for {habit}: {days}, set by hand. Change it',
  /** The tooltip on a habit's streak: whether it was typed in for the day or counted. */
  streakTitleByHand: 'Set by hand on this day',
  streakTitleCounted: 'Set the streak by hand',
  streakInputLabel: 'Streak for {habit} on this day',
  streakHint: 'The days after count on from this number. Leave it empty to count from the marks again.',

  /** The dialog that brings scores written by hand in old entries into the tracker. */
  legacy: {
    title: 'Import old scores',
    marks: 'Marks',
    /** The days the marks were looked for in. */
    marksSub: plural({ one: 'in {count} day', other: 'in {count} days' }),
    ready: 'Ready',
    readySub: 'Certain, new',
    toReview: 'To review',
    toReviewSub: 'Need a look',
    /** `2DAC` is how the old marks wrote a run: keep it as it is. */
    note: 'Only the score is read; run lengths like 2DAC are ignored. Entries are not changed.',
    importScores: plural({ one: 'Import {count} score', other: 'Import {count} scores' }),
    imported: plural({ one: 'Imported {count} score', other: 'Imported {count} scores' }),

    dayToReview: 'Day to review',
    /** Which day is on show: `{current}` of `{total}` still to review. */
    progress: '{current} of {total}',
    reasonMissing: 'A mark has no score beside it.',
    /** `{scale}` is the highest score the old marks used. */
    reasonRange:'A score is outside 1 to {scale}.',
    reasonLetter: 'The letter and the score disagree on whether the day passed.',
    reasonDiffers: 'The day has more than one score.',
    reasonUnsure: 'A mark looks mistyped.',
    reasonExisting: 'The diary already scores this day {value} out of {scale}.',

    scoreForDay: 'Score for this day',
    /** `{score}` is the one written in the entry. */
    scoreForDaySuggested: 'Score for this day · ringed is the one written ({score})',
    scoreValue: 'Score {value}',
    /** Keyboard shortcuts: the digits pick a score, S skips. */
    shortcuts: 'Press 1–9, 0 for 10, or S to skip.',
    skip: 'Skip this day',

    noMarks: 'No marks found in your entries.',
    importThenSettle: 'Import the ready scores, then settle the rest.',
    nothingLeft: 'Nothing left to review.',
  },
};
