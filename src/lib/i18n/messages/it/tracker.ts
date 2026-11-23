import { plural } from '../../format';

/** The day's score and habits, and the temporary import of old scores. */
export default {
  scoreAndHabits: 'Punteggio e abitudini',
  /** The tooltip on the day's summary; `{run}` is like “Passed 3 days in a row”. */
  scoreAndHabitsWithRun: 'Punteggio e abitudini · {run}',
  /** The summary as a screen reader reads it; `{summary}` is the parts below, joined. */
  summaryLabel: '{summary}. Punteggio e abitudini',
  scoreTheDay: 'Valuta il giorno',

  /** `{value}` is the score given, out of `{scale}` (the highest score). */
  scoreOf: '{value} su {scale}',
  scoreSummary: 'Punteggio {value} su {scale}',
  scoreOldScale: '{value} su {scale} con la vecchia scala',
  notScored: 'Non valutato',
  /** `{count}` days of a run in a row. */
  runPassed: plural({ one: 'Superato per {count} giorno di fila', other: 'Superato per {count} giorni di fila' }),
  runFailed: plural({ one: 'Non superato per {count} giorno di fila', other: 'Non superato per {count} giorni di fila' }),
  /** `{done}` of the `{count}` active habits are marked done. */
  habitsDone: plural({ one: '{done} abitudine su {count} fatta', other: '{done} abitudini su {count} fatte' }),

  score: 'Punteggio',
  /** The score's choices as a screen reader reads them: `{step}` of `{scale}`. */
  scoreStep: '{step} su {scale}',

  habits: 'Abitudini',
  editHabits: 'Modifica abitudini',
  habitsEmpty: 'Tieni traccia di qualcosa ogni giorno e scopri quanto a lungo riesci a mantenerlo.',
  addHabitPlaceholder: 'Aggiungi un’abitudine',
  newHabit: 'Nuova abitudine',

  /** The mark a habit has on a day, and the one a tap moves it to. */
  markDone: 'fatta',
  markMissed: 'saltata',
  markNone: 'non segnata',
  /** `{state}` and `{next}` are the words above: the mark now and the one a tap sets. */
  markLabel: '{habit}: {state}. Segna come {next}',

  /** `{days}` is like “5 days”. */
  streakLabel: 'Serie per {habit}: {days}. Modificala',
  streakLabelByHand: 'Serie per {habit}: {days}, impostata a mano. Modificala',
  /** The tooltip on a habit's streak: whether it was typed in for the day or counted. */
  streakTitleByHand: 'Impostata a mano per questo giorno',
  streakTitleCounted: 'Imposta la serie a mano',
  streakInputLabel: 'Serie per {habit} in questo giorno',
  streakHint: 'I giorni successivi proseguono da questo numero. Lascialo vuoto per contare di nuovo dai segni.',

  /** The dialog that brings scores written by hand in old entries into the tracker. */
  legacy: {
    title: 'Importa vecchi punteggi',
    marks: 'Segni',
    /** The days the marks were looked for in. */
    marksSub: plural({ one: 'in {count} giorno', other: 'in {count} giorni' }),
    ready: 'Pronti',
    readySub: 'Certi, nuovi',
    toReview: 'Da rivedere',
    toReviewSub: 'Serve un controllo',
    /** `2DAC` is how the old marks wrote a run: keep it as it is. */
    note: 'Viene letto solo il punteggio; le lunghezze delle serie come 2DAC vengono ignorate. Le voci non vengono modificate.',
    importScores: plural({ one: 'Importa {count} punteggio', other: 'Importa {count} punteggi' }),
    imported: plural({ one: 'Importato {count} punteggio', other: 'Importati {count} punteggi' }),

    dayToReview: 'Giorno da rivedere',
    /** Which day is on show: `{current}` of `{total}` still to review. */
    progress: '{current} di {total}',
    reasonMissing: 'Un segno non ha un punteggio accanto.',
    /** `{scale}` is the highest score the old marks used. */
    reasonRange: 'Un punteggio è fuori dall’intervallo da 1 a {scale}.',
    reasonLetter: 'La lettera e il punteggio non concordano sul fatto che il giorno sia stato superato.',
    reasonDiffers: 'Il giorno ha più di un punteggio.',
    reasonUnsure: 'Un segno sembra scritto male.',
    reasonExisting: 'Il diario ha già un punteggio di {value} su {scale} per questo giorno.',

    scoreForDay: 'Punteggio per questo giorno',
    /** `{score}` is the one written in the entry. */
    scoreForDaySuggested: 'Punteggio per questo giorno · cerchiato quello scritto ({score})',
    scoreValue: 'Punteggio {value}',
    /** Keyboard shortcuts: the digits pick a score, S skips. */
    shortcuts: 'Premi da 1 a 9, 0 per 10, oppure S per saltare.',
    skip: 'Salta questo giorno',

    noMarks: 'Nessun segno trovato nelle tue voci.',
    importThenSettle: 'Importa i punteggi pronti, poi sistema il resto.',
    nothingLeft: 'Niente da rivedere.',
  },
};
