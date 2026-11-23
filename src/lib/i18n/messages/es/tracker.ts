import { plural } from '../../format';

/** The day's score and habits, and the temporary import of old scores. */
export default {
  scoreAndHabits: 'Puntuación y hábitos',
  /** The tooltip on the day's summary; `{run}` is like “Passed 3 days in a row”. */
  scoreAndHabitsWithRun: 'Puntuación y hábitos · {run}',
  /** The summary as a screen reader reads it; `{summary}` is the parts below, joined. */
  summaryLabel: '{summary}. Puntuación y hábitos',
  scoreTheDay: 'Puntúa el día',

  /** `{value}` is the score given, out of `{scale}` (the highest score). */
  scoreOf: '{value} de {scale}',
  scoreSummary: 'Puntuación {value} de {scale}',
  scoreOldScale: '{value} de {scale} en la escala antigua',
  notScored: 'Sin puntuar',
  /** `{count}` days of a run in a row. */
  runPassed: plural({ one: 'Cumplido {count} día seguido', other: 'Cumplidos {count} días seguidos' }),
  runFailed: plural({ one: 'No cumplido {count} día seguido', other: 'No cumplidos {count} días seguidos' }),
  /** `{done}` of the `{count}` active habits are marked done. */
  habitsDone: plural({ one: '{done} de {count} hábito hecho', other: '{done} de {count} hábitos hechos' }),

  score: 'Puntuación',
  /** The score's choices as a screen reader reads them: `{step}` of `{scale}`. */
  scoreStep: '{step} de {scale}',

  habits: 'Hábitos',
  editHabits: 'Editar hábitos',
  habitsEmpty: 'Haz un seguimiento diario de algo y mira cuánto tiempo lo mantienes.',
  addHabitPlaceholder: 'Añade un hábito',
  newHabit: 'Nuevo hábito',

  /** The mark a habit has on a day, and the one a tap moves it to. */
  markDone: 'hecho',
  markMissed: 'no hecho',
  markNone: 'sin marcar',
  /** `{state}` and `{next}` are the words above: the mark now and the one a tap sets. */
  markLabel: '{habit}: {state}. Marcar como {next}',

  /** `{days}` is like “5 days”. */
  streakLabel: 'Racha de {habit}: {days}. Cambiar',
  streakLabelByHand: 'Racha de {habit}: {days}, fijada a mano. Cambiar',
  /** The tooltip on a habit's streak: whether it was typed in for the day or counted. */
  streakTitleByHand: 'Fijada a mano este día',
  streakTitleCounted: 'Fijar la racha a mano',
  streakInputLabel: 'Racha de {habit} este día',
  streakHint: 'Los días siguientes continúan a partir de este número. Déjalo vacío para volver a contar desde las marcas.',

  /** The dialog that brings scores written by hand in old entries into the tracker. */
  legacy: {
    title: 'Importar puntuaciones antiguas',
    marks: 'Marcas',
    /** The days the marks were looked for in. */
    marksSub: plural({ one: 'en {count} día', other: 'en {count} días' }),
    ready: 'Listas',
    readySub: 'Seguras, nuevas',
    toReview: 'Por revisar',
    toReviewSub: 'Necesitan revisión',
    /** `2DAC` is how the old marks wrote a run: keep it as it is. */
    note: 'Solo se lee la puntuación; las rachas como 2DAC se ignoran. Las entradas no se modifican.',
    importScores: plural({ one: 'Importar {count} puntuación', other: 'Importar {count} puntuaciones' }),
    imported: plural({ one: 'Importada {count} puntuación', other: 'Importadas {count} puntuaciones' }),

    dayToReview: 'Día por revisar',
    /** Which day is on show: `{current}` of `{total}` still to review. */
    progress: '{current} de {total}',
    reasonMissing: 'Una marca no tiene ninguna puntuación al lado.',
    /** `{scale}` is the highest score the old marks used. */
    reasonRange: 'Una puntuación está fuera del rango de 1 a {scale}.',
    reasonLetter: 'La letra y la puntuación no coinciden sobre si el día se cumplió.',
    reasonDiffers: 'El día tiene más de una puntuación.',
    reasonUnsure: 'Una marca parece mal escrita.',
    reasonExisting: 'El diario ya puntúa este día con {value} sobre {scale}.',

    scoreForDay: 'Puntuación de este día',
    /** `{score}` is the one written in the entry. */
    scoreForDaySuggested: 'Puntuación de este día · marcada con un círculo la escrita ({score})',
    scoreValue: 'Puntuación {value}',
    /** Keyboard shortcuts: the digits pick a score, S skips. */
    shortcuts: 'Pulsa 1–9, 0 para 10, o S para saltar.',
    skip: 'Saltar este día',

    noMarks: 'No se han encontrado marcas en tus entradas.',
    importThenSettle: 'Importa primero las puntuaciones listas y después revisa el resto.',
    nothingLeft: 'No queda nada por revisar.',
  },
};
