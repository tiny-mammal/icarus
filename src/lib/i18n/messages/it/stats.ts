import { plural } from '../../format';

/** The statistics dialog: writing, tracking, the charts and the periods. */
export default {
  title: 'Statistiche',
  viewLabel: 'Vista statistiche',
  views: { writing: 'Scrittura', tracking: 'Monitoraggio' },

  periodLabel: 'Periodo delle statistiche',
  periods: {
    last30Days: 'Ultimi 30 giorni',
    lastYear: 'Ultimo anno',
    thisYear: 'Quest’anno',
    allTime: 'Tutto',
    custom: 'Intervallo personalizzato…',
    /** The heading of the calendar that replaces the list of periods. */
    customPanel: 'Intervallo personalizzato',
  },

  /** A unit set in a quieter tone beside a number, like “5 days”. */
  dayUnit: plural({ one: 'giorno', other: 'giorni' }),
  characters: plural({ one: '{count} carattere', other: '{count} caratteri' }),
  /** A moving average over the last `{count}` days, as in “7-day average”. */
  movingAverage: plural({ one: 'media mobile di {count} giorno', other: 'media mobile di {count} giorni' }),

  chart: {
    /** The legend entry for the bars: one bar per day, week or month. */
    barsDaily: 'Giornaliero',
    barsWeekly: 'Settimanale',
    barsMonthly: 'Mensile',
    /** Weekly and monthly bars show an amount per day, not a total. */
    barsWeeklyPerDay: 'Settimanale (al giorno)',
    barsMonthlyPerDay: 'Mensile (al giorno)',
  },

  writing: {
    /** A short label above a figure (all capitals): the number of entries. */
    entries: 'Voci',
    characters: 'Caratteri',
    /** Short for “average entry”: fits a small tile label. */
    averageEntry: 'Media voce',
    charactersPerEntry: 'Caratteri per voce',
    bestDay: 'Giorno migliore',

    charactersPerDay: 'Caratteri al giorno',
    chartLabel: 'Caratteri scritti nel periodo selezionato',
    /** `{characters}` is like “1.200 caratteri”, `{entries}` like “3 voci”. */
    chartTotals: '{characters} · {entries}',
    /** `{value}` is a number of characters; `{count}` is the days the average spans. */
    chartPerDayAverage: plural({
      one: '{value} al giorno, media su {count} giorno',
      other: '{value} al giorno, media su {count} giorni',
    }),
    noEntries: 'Nessuna voce in questo periodo.',
    nothingWritten: 'Niente scritto in questo periodo.',

    topDays: 'Giorni di punta',
    topDaysHint: 'In base ai caratteri scritti',
  },

  tracking: {
    nothingTracked: 'Nessun punteggio o segno in questo periodo.',

    /** Short for “average score”: fits a small tile label. */
    averageScore: 'Media punteggio',
    daysScored: plural({ one: '{count} giorno con punteggio', other: '{count} giorni con punteggio' }),
    passingDays: 'Giorni superati',
    /** `{passed}` of the `{count}` days that were scored. */
    passedOfScored: plural({ one: '{passed} di {count} giorno', other: '{passed} di {count} giorni' }),
    currentRun: 'Serie attuale',
    runPassing: 'Superati',
    runFailing: 'Non superati',
    runNothingScored: 'Nessun punteggio ancora',
    bestRun: 'Serie migliore',
    worstRun: 'Serie peggiore',
    showWorstRun: 'Mostra serie peggiore',
    showBestRun: 'Mostra serie migliore',
    runStillGoing: 'In corso',
    /** `{date}` is a month and year, like “March 2025”. */
    runUntil: 'Fino a {date}',
    noPassingDay: 'Nessun giorno superato ancora',
    noFailingDay: 'Nessun giorno non superato ancora',
    /** The tile as a screen reader reads it; `{action}` says what pressing it does. */
    runTileLabel: '{label}: {value}. {detail}. {action}',

    scoreOverTime: 'Punteggio nel tempo',
    chartLabel: 'Punteggio medio nel periodo selezionato',
    /** The pass mark's line across the chart; `{score}` is the lowest passing score. */
    passMark: 'Soglia ({score})',
    /** `{value}` is an average score; `{days}` is like “3 days scored”. */
    chartAverage: '{value} media · {days}',
    chartNoScore: 'Nessun punteggio',
    /** `{value}` is an average score; `{count}` is the days the moving average spans. */
    chartMovingAverage: plural({
      one: '{value}, media su {count} giorno',
      other: '{value}, media su {count} giorni',
    }),
    noScoredDays: 'Nessun giorno con punteggio in questo periodo.',

    scoreDistribution: 'Distribuzione dei punteggi',
    /** Also the accessible name of the bars. */
    daysGivenEachScore: 'Giorni per ogni punteggio',
    /** One bar of the distribution; `{days}` is like “3 days”. */
    scoreDays: 'Punteggio {value}: {days}',
  },

  habits: {
    title: 'Abitudini',
    hint: 'Le serie coprono tutto il tempo; le percentuali seguono il periodo',
    done: 'Fatta',
    missed: 'Saltata',
    notMarked: 'Non segnata',

    noStreakYet: 'Nessuna serie ancora',
    archived: 'Archiviata',
    /** `{date}` is the first day the habit was marked, like “3 Mar 2025”. */
    trackedSince: 'Monitorata dal {date}',
    notMarkedYet: 'Non ancora segnata',
    /** The tooltip on the streak's number; `{date}` is the day the streak began. */
    streakStarted: 'Serie iniziata il {date}',
    streakStartedEstimated: 'Inizio stimato della serie: {date}',

    current: 'Attuale',
    best: 'Migliore',
    noActiveStreak: 'Nessuna serie attiva',
    longestStreak: 'La più lunga',
    activeStreak: 'Serie attiva',
    /** `{done}` of the `{count}` days the habit was counted on. */
    rateOf: plural({ one: '{done} di {count} giorno', other: '{done} di {count} giorni' }),
    rateNotMarked: 'Non segnata in questo periodo',

    lastDays: plural({ one: 'Ultimo {count} giorno', other: 'Ultimi {count} giorni' }),
    /** The strip of recent marks as a screen reader reads it. */
    lastDaysSummary: plural({
      one: 'Ultimo {count} giorno: {done} fatto, {missed} saltato',
      other: 'Ultimi {count} giorni: {done} fatti, {missed} saltati',
    }),
  },
};
