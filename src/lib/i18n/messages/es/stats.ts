import { plural } from '../../format';

/** The statistics dialog: writing, tracking, the charts and the periods. */
export default {
  title: 'Estadísticas',
  viewLabel: 'Vista de estadísticas',
  views: { writing: 'Escritura', tracking: 'Seguimiento' },

  periodLabel: 'Periodo de estadísticas',
  periods: {
    last30Days: 'Últimos 30 días',
    lastYear: 'Último año',
    thisYear: 'Este año',
    allTime: 'Desde siempre',
    custom: 'Rango personalizado…',
    /** The heading of the calendar that replaces the list of periods. */
    customPanel: 'Rango personalizado',
  },

  /** A unit set in a quieter tone beside a number, like “5 days”. */
  dayUnit: plural({ one: 'día', other: 'días' }),
  characters: plural({ one: '{count} carácter', other: '{count} caracteres' }),
  /** A moving average over the last `{count}` days, as in “7-day average”. */
  movingAverage: plural({ one: 'Media de {count} día', other: 'Media de {count} días' }),

  chart: {
    /** The legend entry for the bars: one bar per day, week or month. */
    barsDaily: 'Diario',
    barsWeekly: 'Semanal',
    barsMonthly: 'Mensual',
    /** Weekly and monthly bars show an amount per day, not a total. */
    barsWeeklyPerDay: 'Semanal (por día)',
    barsMonthlyPerDay: 'Mensual (por día)',
  },

  writing: {
    /** A short label above a figure (all capitals): the number of entries. */
    entries: 'Entradas',
    characters: 'Caracteres',
    /** Short for “average entry”: fits a small tile label. */
    averageEntry: 'Med. entrada',
    charactersPerEntry: 'Caracteres por entrada',
    bestDay: 'Mejor día',

    charactersPerDay: 'Caracteres por día',
    chartLabel: 'Caracteres escritos en el periodo elegido',
    /** `{characters}` is like “1,200 characters”, `{entries}` like “3 entries”. */
    chartTotals: '{characters} · {entries}',
    /** `{value}` is a number of characters; `{count}` is the days the average spans. */
    chartPerDayAverage: plural({
      one: '{value} por día, media de {count} día',
      other: '{value} por día, media de {count} días',
    }),
    noEntries: 'No hay entradas en este periodo.',
    nothingWritten: 'No se escribió nada en este periodo.',

    topDays: 'Días con más texto',
    topDaysHint: 'Por caracteres escritos',
  },

  tracking: {
    nothingTracked: 'No hay nada puntuado ni marcado en este periodo.',

    /** Short for “average score”: fits a small tile label. */
    averageScore: 'Med. puntuación',
    daysScored: plural({ one: '{count} día puntuado', other: '{count} días puntuados' }),
    passingDays: 'Días cumplidos',
    /** `{passed}` of the `{count}` days that were scored. */
    passedOfScored: plural({ one: '{passed} de {count} día', other: '{passed} de {count} días' }),
    currentRun: 'Racha actual',
    runPassing: 'Cumpliendo',
    runFailing: 'No cumpliendo',
    runNothingScored: 'Nada puntuado aún',
    bestRun: 'Mejor racha',
    worstRun: 'Peor racha',
    showWorstRun: 'Ver peor racha',
    showBestRun: 'Ver mejor racha',
    runStillGoing: 'Sigue en curso',
    /** `{date}` is a month and year, like “March 2025”. */
    runUntil: 'Hasta {date}',
    noPassingDay: 'Aún no hay ningún día cumplido',
    noFailingDay: 'Aún no hay ningún día no cumplido',
    /** The tile as a screen reader reads it; `{action}` says what pressing it does. */
    runTileLabel: '{label}: {value}. {detail}. {action}',

    scoreOverTime: 'Puntuación a lo largo del tiempo',
    chartLabel: 'Puntuación media en el periodo elegido',
    /** The pass mark's line across the chart; `{score}` is the lowest passing score. */
    passMark: 'Puntuación mínima ({score})',
    /** `{value}` is an average score; `{days}` is like “3 days scored”. */
    chartAverage: '{value} de media · {days}',
    chartNoScore: 'Sin puntuación',
    /** `{value}` is an average score; `{count}` is the days the moving average spans. */
    chartMovingAverage: plural({
      one: '{value}, media de {count} día',
      other: '{value}, media de {count} días',
    }),
    noScoredDays: 'No hay días puntuados en este periodo.',

    scoreDistribution: 'Distribución de puntuaciones',
    /** Also the accessible name of the bars. */
    daysGivenEachScore: 'Días con cada puntuación',
    /** One bar of the distribution; `{days}` is like “3 days”. */
    scoreDays: 'Puntuación {value}: {days}',
  },

  habits: {
    title: 'Hábitos',
    hint: 'Las rachas abarcan todo el tiempo; las tasas siguen el periodo',
    done: 'Hecho',
    missed: 'No hecho',
    notMarked: 'Sin marcar',

    noStreakYet: 'Aún no hay racha',
    archived: 'Archivado',
    /** `{date}` is the first day the habit was marked, like “3 Mar 2025”. */
    trackedSince: 'Seguido desde {date}',
    notMarkedYet: 'Aún sin marcar',
    /** The tooltip on the streak's number; `{date}` is the day the streak began. */
    streakStarted: 'Racha iniciada: {date}',
    streakStartedEstimated: 'Inicio estimado de la racha: {date}',

    current: 'Actual',
    best: 'Mejor',
    noActiveStreak: 'Sin racha activa',
    longestStreak: 'Tu más larga',
    activeStreak: 'Racha activa',
    /** `{done}` of the `{count}` days the habit was counted on. */
    rateOf: plural({ one: '{done} de {count} día', other: '{done} de {count} días' }),
    rateNotMarked: 'Sin marcar en este periodo',

    lastDays: plural({ one: 'Último {count} día', other: 'Últimos {count} días' }),
    /** The strip of recent marks as a screen reader reads it. */
    lastDaysSummary: plural({
      one: 'Último {count} día: {done} hechos, {missed} no hechos',
      other: 'Últimos {count} días: {done} hechos, {missed} no hechos',
    }),
  },
};
