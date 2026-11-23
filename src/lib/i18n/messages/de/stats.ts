import { plural } from '../../format';

/** The statistics dialog: writing, tracking, the charts and the periods. */
export default {
  title: 'Statistik',
  viewLabel: 'Statistikansicht',
  views: { writing: 'Schreiben', tracking: 'Tracking' },

  periodLabel: 'Zeitraum der Statistik',
  periods: {
    last30Days: 'Letzte 30 Tage',
    lastYear: 'Letztes Jahr',
    thisYear: 'Dieses Jahr',
    allTime: 'Gesamte Zeit',
    custom: 'Eigener Zeitraum…',
    /** The heading of the calendar that replaces the list of periods. */
    customPanel: 'Eigener Zeitraum',
  },

  /** A unit set in a quieter tone beside a number, like “5 days”. */
  dayUnit: plural({ one: 'Tag', other: 'Tage' }),
  characters: plural({ one: '{count} Zeichen', other: '{count} Zeichen' }),
  /** A moving average over the last `{count}` days, as in “7-day average”. */
  movingAverage: plural({ one: '{count}-Tage-Durchschnitt', other: '{count}-Tage-Durchschnitt' }),

  chart: {
    /** The legend entry for the bars: one bar per day, week or month. */
    barsDaily: 'Täglich',
    barsWeekly: 'Wöchentlich',
    barsMonthly: 'Monatlich',
    /** Weekly and monthly bars show an amount per day, not a total. */
    barsWeeklyPerDay: 'Wöchentlich (pro Tag)',
    barsMonthlyPerDay: 'Monatlich (pro Tag)',
  },

  writing: {
    /** A short label above a figure (all capitals): the number of entries. */
    entries: 'Einträge',
    characters: 'Zeichen',
    /** Short for “average entry”: fits a small tile label. */
    averageEntry: 'Ø Eintrag',
    charactersPerEntry: 'Zeichen pro Eintrag',
    bestDay: 'Bester Tag',

    charactersPerDay: 'Zeichen pro Tag',
    chartLabel: 'Geschriebene Zeichen im gewählten Zeitraum',
    /** `{characters}` is like “1,200 characters”, `{entries}` like “3 entries”. */
    chartTotals: '{characters} · {entries}',
    /** `{value}` is a number of characters; `{count}` is the days the average spans. */
    chartPerDayAverage: plural({
      one: '{value} pro Tag, {count}-Tage-Durchschnitt',
      other: '{value} pro Tag, {count}-Tage-Durchschnitt',
    }),
    noEntries: 'Keine Einträge in diesem Zeitraum.',
    nothingWritten: 'In diesem Zeitraum wurde nichts geschrieben.',

    topDays: 'Top-Tage',
    topDaysHint: 'Nach geschriebenen Zeichen',
  },

  tracking: {
    nothingTracked: 'In diesem Zeitraum wurde nichts bewertet oder markiert.',

    /** Short for “average score”: fits a small tile label. */
    averageScore: 'Ø Bewertung',
    daysScored: plural({ one: '{count} Tag bewertet', other: '{count} Tage bewertet' }),
    passingDays: 'Bestandene Tage',
    /** `{passed}` of the `{count}` days that were scored. */
    passedOfScored: plural({ one: '{passed} von {count} Tag', other: '{passed} von {count} Tagen' }),
    currentRun: 'Aktuelle Serie',
    runPassing: 'Bestanden',
    runFailing: 'Nicht bestanden',
    runNothingScored: 'Noch nichts bewertet',
    bestRun: 'Beste Serie',
    worstRun: 'Schlechteste Serie',
    showWorstRun: 'Schlechteste Serie anzeigen',
    showBestRun: 'Beste Serie anzeigen',
    runStillGoing: 'Läuft noch',
    /** `{date}` is a month and year, like “March 2025”. */
    runUntil: 'Bis {date}',
    noPassingDay: 'Noch kein bestandener Tag',
    noFailingDay: 'Noch kein nicht bestandener Tag',
    /** The tile as a screen reader reads it; `{action}` says what pressing it does. */
    runTileLabel: '{label}: {value}. {detail}. {action}',

    scoreOverTime: 'Bewertung im Zeitverlauf',
    chartLabel: 'Durchschnittliche Bewertung im gewählten Zeitraum',
    /** The pass mark's line across the chart; `{score}` is the lowest passing score. */
    passMark: 'Bestehensgrenze ({score})',
    /** `{value}` is an average score; `{days}` is like “3 days scored”. */
    chartAverage: '{value} Durchschnitt · {days}',
    chartNoScore: 'Keine Bewertung',
    /** `{value}` is an average score; `{count}` is the days the moving average spans. */
    chartMovingAverage: plural({
      one: '{value}, {count}-Tage-Durchschnitt',
      other: '{value}, {count}-Tage-Durchschnitt',
    }),
    noScoredDays: 'In diesem Zeitraum wurden keine Tage bewertet.',

    scoreDistribution: 'Verteilung der Bewertungen',
    /** Also the accessible name of the bars. */
    daysGivenEachScore: 'Tage pro Bewertung',
    /** One bar of the distribution; `{days}` is like “3 days”. */
    scoreDays: 'Bewertung {value}: {days}',
  },

  habits: {
    title: 'Gewohnheiten',
    hint: 'Serien laufen über die gesamte Zeit; Quoten richten sich nach dem Zeitraum',
    done: 'Erledigt',
    missed: 'Verpasst',
    notMarked: 'Nicht markiert',

    noStreakYet: 'Noch keine Serie',
    archived: 'Archiviert',
    /** `{date}` is the first day the habit was marked, like “3 Mar 2025”. */
    trackedSince: 'Verfolgt seit {date}',
    notMarkedYet: 'Noch nicht markiert',
    /** The tooltip on the streak's number; `{date}` is the day the streak began. */
    streakStarted: 'Serie begonnen: {date}',
    streakStartedEstimated: 'Geschätzter Serienbeginn: {date}',

    current: 'Aktuell',
    best: 'Beste',
    noActiveStreak: 'Keine aktive Serie',
    longestStreak: 'Deine längste',
    activeStreak: 'Aktive Serie',
    /** `{done}` of the `{count}` days the habit was counted on. */
    rateOf: plural({ one: '{done} von {count} Tag', other: '{done} von {count} Tagen' }),
    rateNotMarked: 'In diesem Zeitraum nicht markiert',

    lastDays: plural({ one: 'Letzter Tag', other: 'Letzte {count} Tage' }),
    /** The strip of recent marks as a screen reader reads it. */
    lastDaysSummary: plural({
      one: 'Letzter Tag: {done} erledigt, {missed} verpasst',
      other: 'Letzte {count} Tage: {done} erledigt, {missed} verpasst',
    }),
  },
};
