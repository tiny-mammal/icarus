import { plural } from '../../format';

/** The day's score and habits, and the temporary import of old scores. */
export default {
  scoreAndHabits: 'Note et habitudes',
  /** The tooltip on the day's summary; `{run}` is like “Passed 3 days in a row”. */
  scoreAndHabitsWithRun: 'Note et habitudes · {run}',
  /** The summary as a screen reader reads it; `{summary}` is the parts below, joined. */
  summaryLabel: '{summary}. Note et habitudes',
  scoreTheDay: 'Noter la journée',

  /** `{value}` is the score given, out of `{scale}` (the highest score). */
  scoreOf: '{value} sur {scale}',
  scoreSummary: 'Note {value} sur {scale}',
  scoreOldScale: '{value} sur {scale} selon l’ancienne échelle',
  notScored: 'Non notée',
  /** `{count}` days of a run in a row. */
  runPassed: plural({ one: '{count} jour réussi d’affilée', other: '{count} jours réussis d’affilée' }),
  runFailed: plural({ one: '{count} jour raté d’affilée', other: '{count} jours ratés d’affilée' }),
  /** `{done}` of the `{count}` active habits are marked done. */
  habitsDone: plural({ one: '{done} habitude faite sur {count}', other: '{done} habitudes faites sur {count}' }),

  score: 'Note',
  /** The score's choices as a screen reader reads them: `{step}` of `{scale}`. */
  scoreStep: '{step} sur {scale}',

  habits: 'Habitudes',
  editHabits: 'Modifier les habitudes',
  habitsEmpty: 'Suivez quelque chose chaque jour et voyez combien de temps vous tenez bon.',
  addHabitPlaceholder: 'Ajouter une habitude',
  newHabit: 'Nouvelle habitude',

  /** The mark a habit has on a day, and the one a tap moves it to. */
  markDone: 'faite',
  markMissed: 'manquée',
  markNone: 'non marquée',
  /** `{state}` and `{next}` are the words above: the mark now and the one a tap sets. */
  markLabel: '{habit} : {state}. Marquer comme {next}',

  /** `{days}` is like “5 days”. */
  streakLabel: 'Série pour {habit} : {days}. Modifier',
  streakLabelByHand: 'Série pour {habit} : {days}, réglée à la main. Modifier',
  /** The tooltip on a habit's streak: whether it was typed in for the day or counted. */
  streakTitleByHand: 'Réglée à la main ce jour-là',
  streakTitleCounted: 'Régler la série à la main',
  streakInputLabel: 'Série pour {habit} ce jour-là',
  streakHint: 'Les jours suivants reprennent à partir de ce nombre. Laissez vide pour recalculer à partir des marques.',

  /** The dialog that brings scores written by hand in old entries into the tracker. */
  legacy: {
    title: 'Importer les anciennes notes',
    marks: 'Marques',
    /** The days the marks were looked for in. */
    marksSub: plural({ one: 'dans {count} jour', other: 'dans {count} jours' }),
    ready: 'Prêtes',
    readySub: 'Sûres, nouvelles',
    toReview: 'À vérifier',
    toReviewSub: 'À examiner',
    /** `2DAC` is how the old marks wrote a run: keep it as it is. */
    note: 'Seule la note est lue ; les longueurs de série comme 2DAC sont ignorées. Les entrées ne sont pas modifiées.',
    importScores: plural({ one: 'Importer {count} note', other: 'Importer {count} notes' }),
    imported: plural({ one: '{count} note importée', other: '{count} notes importées' }),

    dayToReview: 'Jour à vérifier',
    /** Which day is on show: `{current}` of `{total}` still to review. */
    progress: '{current} sur {total}',
    reasonMissing: 'Une marque n’a pas de note à côté.',
    /** `{scale}` is the highest score the old marks used. */
    reasonRange: 'Une note est en dehors de 1 à {scale}.',
    reasonLetter: 'La lettre et la note ne s’accordent pas sur la réussite du jour.',
    reasonDiffers: 'Le jour a plus d’une note.',
    reasonUnsure: 'Une marque semble mal saisie.',
    reasonExisting: 'Le journal note déjà ce jour {value} sur {scale}.',

    scoreForDay: 'Note pour ce jour',
    /** `{score}` is the one written in the entry. */
    scoreForDaySuggested: 'Note pour ce jour · entourée : celle écrite dans l’entrée ({score})',
    scoreValue: 'Note {value}',
    /** Keyboard shortcuts: the digits pick a score, S skips. */
    shortcuts: 'Appuyez sur 1 à 9, 0 pour 10, ou sur S pour passer.',
    skip: 'Passer ce jour',

    noMarks: 'Aucune marque trouvée dans vos entrées.',
    importThenSettle: 'Importez les notes prêtes, puis réglez le reste.',
    nothingLeft: 'Plus rien à vérifier.',
  },
};
