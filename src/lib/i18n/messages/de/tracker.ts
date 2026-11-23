import { plural } from '../../format';

/** The day's score and habits, and the temporary import of old scores. */
export default {
  scoreAndHabits: 'Bewertung und Gewohnheiten',
  /** The tooltip on the day's summary; `{run}` is like “Passed 3 days in a row”. */
  scoreAndHabitsWithRun: 'Bewertung und Gewohnheiten · {run}',
  /** The summary as a screen reader reads it; `{summary}` is the parts below, joined. */
  summaryLabel: '{summary}. Bewertung und Gewohnheiten',
  scoreTheDay: 'Tag bewerten',

  /** `{value}` is the score given, out of `{scale}` (the highest score). */
  scoreOf: '{value} von {scale}',
  scoreSummary: 'Bewertung {value} von {scale}',
  scoreOldScale: '{value} von {scale} auf der alten Skala',
  notScored: 'Nicht bewertet',
  /** `{count}` days of a run in a row. */
  runPassed: plural({ one: '{count} Tag in Folge bestanden', other: '{count} Tage in Folge bestanden' }),
  runFailed: plural({ one: '{count} Tag in Folge nicht bestanden', other: '{count} Tage in Folge nicht bestanden' }),
  /** `{done}` of the `{count}` active habits are marked done. */
  habitsDone: plural({ one: '{done} von {count} Gewohnheit erledigt', other: '{done} von {count} Gewohnheiten erledigt' }),

  score: 'Bewertung',
  /** The score's choices as a screen reader reads them: `{step}` of `{scale}`. */
  scoreStep: '{step} von {scale}',

  habits: 'Gewohnheiten',
  editHabits: 'Gewohnheiten bearbeiten',
  habitsEmpty: 'Verfolge jeden Tag etwas und sieh, wie lange du es durchhältst.',
  addHabitPlaceholder: 'Gewohnheit hinzufügen',
  newHabit: 'Neue Gewohnheit',

  /** The mark a habit has on a day, and the one a tap moves it to. */
  markDone: 'erledigt',
  markMissed: 'verpasst',
  markNone: 'nicht markiert',
  /** `{state}` and `{next}` are the words above: the mark now and the one a tap sets. */
  markLabel: '{habit}: {state}. Als {next} markieren',

  /** `{days}` is like “5 days”. */
  streakLabel: 'Serie für {habit}: {days}. Ändern',
  streakLabelByHand: 'Serie für {habit}: {days}, von Hand gesetzt. Ändern',
  /** The tooltip on a habit's streak: whether it was typed in for the day or counted. */
  streakTitleByHand: 'An diesem Tag von Hand gesetzt',
  streakTitleCounted: 'Serie von Hand setzen',
  streakInputLabel: 'Serie für {habit} an diesem Tag',
  streakHint: 'Die folgenden Tage zählen ab dieser Zahl weiter. Lass das Feld leer, um wieder anhand der Markierungen zu zählen.',

  /** The dialog that brings scores written by hand in old entries into the tracker. */
  legacy: {
    title: 'Alte Bewertungen importieren',
    marks: 'Markierungen',
    /** The days the marks were looked for in. */
    marksSub: plural({ one: 'in {count} Tag', other: 'in {count} Tagen' }),
    ready: 'Bereit',
    readySub: 'Sicher, neu',
    toReview: 'Zu prüfen',
    toReviewSub: 'Brauchen einen Blick',
    /** `2DAC` is how the old marks wrote a run: keep it as it is. */
    note: 'Nur die Bewertung wird gelesen; Serienlängen wie 2DAC werden ignoriert. Einträge werden nicht verändert.',
    importScores: plural({ one: '{count} Bewertung importieren', other: '{count} Bewertungen importieren' }),
    imported: plural({ one: '{count} Bewertung importiert', other: '{count} Bewertungen importiert' }),

    dayToReview: 'Tag zur Prüfung',
    /** Which day is on show: `{current}` of `{total}` still to review. */
    progress: '{current} von {total}',
    reasonMissing: 'Eine Markierung hat keine Bewertung daneben.',
    /** `{scale}` is the highest score the old marks used. */
    reasonRange: 'Eine Bewertung liegt außerhalb von 1 bis {scale}.',
    reasonLetter: 'Der Buchstabe und die Bewertung sind sich uneinig, ob der Tag bestanden wurde.',
    reasonDiffers: 'Der Tag hat mehr als eine Bewertung.',
    reasonUnsure: 'Eine Markierung sieht nach einem Tippfehler aus.',
    reasonExisting: 'Das Tagebuch bewertet diesen Tag bereits mit {value} von {scale}.',

    scoreForDay: 'Bewertung für diesen Tag',
    /** `{score}` is the one written in the entry. */
    scoreForDaySuggested: 'Bewertung für diesen Tag · umrandet ist die geschriebene ({score})',
    scoreValue: 'Bewertung {value}',
    /** Keyboard shortcuts: the digits pick a score, S skips. */
    shortcuts: 'Drücke 1–9, 0 für 10 oder S zum Überspringen.',
    skip: 'Diesen Tag überspringen',

    noMarks: 'Keine Markierungen in deinen Einträgen gefunden.',
    importThenSettle: 'Importiere die bereiten Bewertungen und kläre dann den Rest.',
    nothingLeft: 'Nichts mehr zu prüfen.',
  },
};
