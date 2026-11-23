import { plural } from '../../format';

/** The statistics dialog: writing, tracking, the charts and the periods. */
export default {
  title: 'Statistiques',
  viewLabel: 'Affichage des statistiques',
  views: { writing: 'Rédaction', tracking: 'Suivi' },

  periodLabel: 'Période des statistiques',
  periods: {
    last30Days: '30 derniers jours',
    lastYear: 'L’année dernière',
    thisYear: 'Cette année',
    allTime: 'Depuis le début',
    custom: 'Période personnalisée…',
    /** The heading of the calendar that replaces the list of periods. */
    customPanel: 'Période personnalisée',
  },

  /** A unit set in a quieter tone beside a number, like “5 days”. */
  dayUnit: plural({ one: 'jour', other: 'jours' }),
  characters: plural({ one: '{count} caractère', other: '{count} caractères' }),
  /** A moving average over the last `{count}` days, as in “7-day average”. */
  movingAverage: plural({ one: 'moyenne sur {count} jour', other: 'moyenne sur {count} jours' }),

  chart: {
    /** The legend entry for the bars: one bar per day, week or month. */
    barsDaily: 'Par jour',
    barsWeekly: 'Par semaine',
    barsMonthly: 'Par mois',
    /** Weekly and monthly bars show an amount per day, not a total. */
    barsWeeklyPerDay: 'Par semaine (par jour)',
    barsMonthlyPerDay: 'Par mois (par jour)',
  },

  writing: {
    /** A short label above a figure (all capitals): the number of entries. */
    entries: 'Entrées',
    characters: 'Caractères',
    /** Short for “average entry”: fits a small tile label. */
    averageEntry: 'Moy. entrée',
    charactersPerEntry: 'Caractères par entrée',
    bestDay: 'Meilleur jour',

    charactersPerDay: 'Caractères par jour',
    chartLabel: 'Caractères rédigés sur la période choisie',
    /** `{characters}` is like “1,200 characters”, `{entries}` like “3 entries”. */
    chartTotals: '{characters} · {entries}',
    /** `{value}` is a number of characters; `{count}` is the days the average spans. */
    chartPerDayAverage: plural({
      one: '{value} par jour, moyenne sur {count} jour',
      other: '{value} par jour, moyenne sur {count} jours',
    }),
    noEntries: 'Aucune entrée sur cette période.',
    nothingWritten: 'Rien d’écrit sur cette période.',

    topDays: 'Jours les plus longs',
    topDaysHint: 'Par caractères rédigés',
  },

  tracking: {
    nothingTracked: 'Aucune note ni marque sur cette période.',

    /** Short for “average score”: fits a small tile label. */
    averageScore: 'Note moy.',
    daysScored: plural({ one: '{count} jour noté', other: '{count} jours notés' }),
    passingDays: 'Jours réussis',
    /** `{passed}` of the `{count}` days that were scored. */
    passedOfScored: plural({ one: '{passed} sur {count} jour', other: '{passed} sur {count} jours' }),
    currentRun: 'Série en cours',
    runPassing: 'Réussie',
    runFailing: 'Ratée',
    runNothingScored: 'Aucune note pour l’instant',
    bestRun: 'Meilleure série',
    worstRun: 'Pire série',
    showWorstRun: 'Afficher la pire série',
    showBestRun: 'Afficher la meilleure série',
    runStillGoing: 'En cours',
    /** `{date}` is a month and year, like “March 2025”. */
    runUntil: 'Jusqu’à {date}',
    noPassingDay: 'Aucun jour réussi pour l’instant',
    noFailingDay: 'Aucun jour raté pour l’instant',
    /** The tile as a screen reader reads it; `{action}` says what pressing it does. */
    runTileLabel: '{label} : {value}. {detail}. {action}',

    scoreOverTime: 'Note au fil du temps',
    chartLabel: 'Note moyenne sur la période choisie',
    /** The pass mark's line across the chart; `{score}` is the lowest passing score. */
    passMark: 'Seuil de réussite ({score})',
    /** `{value}` is an average score; `{days}` is like “3 days scored”. */
    chartAverage: '{value} en moyenne · {days}',
    chartNoScore: 'Aucune note',
    /** `{value}` is an average score; `{count}` is the days the moving average spans. */
    chartMovingAverage: plural({
      one: '{value}, moyenne sur {count} jour',
      other: '{value}, moyenne sur {count} jours',
    }),
    noScoredDays: 'Aucun jour noté sur cette période.',

    scoreDistribution: 'Répartition des notes',
    /** Also the accessible name of the bars. */
    daysGivenEachScore: 'Jours par note attribuée',
    /** One bar of the distribution; `{days}` is like “3 days”. */
    scoreDays: 'Note {value} : {days}',
  },

  habits: {
    title: 'Habitudes',
    hint: 'Les séries couvrent toute la durée ; les taux suivent la période',
    done: 'Faite',
    missed: 'Manquée',
    notMarked: 'Non marquée',

    noStreakYet: 'Aucune série pour l’instant',
    archived: 'Archivée',
    /** `{date}` is the first day the habit was marked, like “3 Mar 2025”. */
    trackedSince: 'Suivie depuis le {date}',
    notMarkedYet: 'Pas encore marquée',
    /** The tooltip on the streak's number; `{date}` is the day the streak began. */
    streakStarted: 'Série commencée le {date}',
    streakStartedEstimated: 'Début de série estimé : {date}',

    current: 'En cours',
    best: 'Record',
    noActiveStreak: 'Aucune série en cours',
    longestStreak: 'Votre plus longue',
    activeStreak: 'Série en cours',
    /** `{done}` of the `{count}` days the habit was counted on. */
    rateOf: plural({ one: '{done} sur {count} jour', other: '{done} sur {count} jours' }),
    rateNotMarked: 'Non marquée sur cette période',

    lastDays: plural({ one: '{count} dernier jour', other: '{count} derniers jours' }),
    /** The strip of recent marks as a screen reader reads it. */
    lastDaysSummary: plural({
      one: '{count} dernier jour : fait {done}, manqué {missed}',
      other: '{count} derniers jours : fait {done}, manqué {missed}',
    }),
  },
};
