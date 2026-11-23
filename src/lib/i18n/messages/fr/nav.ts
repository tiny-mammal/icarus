import { plural } from '../../format';

/** Navigation and shared controls: top bar, calendars, day pane, feed, search, pickers and dialogs. */
export default {
  /* Top bar */
  search: 'Rechercher',
  searchEntries: 'Rechercher dans les entrées',
  searchPlaceholder: 'Rechercher dans les entrées…',
  clearSearch: 'Effacer la recherche',
  closeSearch: 'Fermer la recherche',
  statistics: 'Statistiques',
  lockDiary: 'Verrouiller le journal',
  settings: 'Réglages',
  settingsUpdateAvailable: 'Réglages, mise à jour disponible',
  settingsUpdateAvailableHint: 'Réglages · mise à jour disponible',

  /* Search results */
  noMatchingEntries: 'Aucune entrée correspondante',
  results: plural({ one: '{count} résultat', other: '{count} résultats' }),
  /** `{shown}` of the `{count}` results are listed so far. */
  showingResults: plural({
    one: 'Affichage de {shown} sur {count} résultat',
    other: 'Affichage de {shown} sur {count} résultats',
  }),
  newestFirst: 'Récentes d’abord',
  oldestFirst: 'Anciennes d’abord',
  /** Button naming the order now in use and what pressing it does. */
  showNewestFirst: 'Anciennes d’abord, afficher les récentes d’abord',
  showOldestFirst: 'Récentes d’abord, afficher les anciennes d’abord',

  /* Calendars */
  previousMonth: 'Mois précédent',
  nextMonth: 'Mois suivant',
  previousYear: 'Année précédente',
  nextYear: 'Année suivante',
  selectMonthAndYear: 'Choisir le mois et l’année',
  /** Jumps to the current day or month. */
  today: 'Aujourd’hui',
  /** A day in the calendar, read out in full: `{day}` is the date, `{titles}` the entry titles. */
  dayWithEntries: plural({
    one: '{day}, {count} entrée : {titles}',
    other: '{day}, {count} entrées : {titles}',
  }),
  /** Last line of a calendar cell whose entries do not all fit; `{count}` is how many are hidden. */
  moreEntries: '+{count} autres',
  /** A day in the small calendar: its date followed by what is special about it. */
  dayHasEntries: 'contient des entrées',
  dayRangeStart: 'début de la période',
  dayRangeEnd: 'fin de la période',
  daySelected: 'sélectionné',

  /* Date pickers */
  pickDate: 'Choisir une date',
  rangeEnds: 'Bornes de la période',
  /** The two ends of a date range: the first day and the last day. */
  rangeFrom: 'Du',
  rangeTo: 'Au',
  pickDay: 'Choisir un jour',
  pickFirstDay: 'Choisir le premier jour',
  pickLastDay: 'Choisir le dernier jour',
  /** Days of the chosen range that hold at least one entry. */
  rangeDaysWithEntries: '{count} avec entrées',
  rangeNothingWritten: 'Rien d’écrit',
  apply: 'Appliquer',

  /* Day pane */
  previousDay: 'Jour précédent',
  nextDay: 'Jour suivant',
  noEarlierEntries: 'Aucune entrée antérieure',
  noLaterEntries: 'Aucune entrée ultérieure',
  /** Hints on the day arrows; `{day}` is the day they lead to. */
  previousDayHint: 'Jour précédent · {day}',
  nextDayHint: 'Jour suivant · {day}',
  previousEntry: 'Entrée précédente',
  nextEntry: 'Entrée suivante',
  /** Dot under the entry pager; `{number}` counts from 1. */
  goToEntry: 'Aller à l’entrée {number}',
  noEntriesOnDay: 'Aucune entrée ce jour-là pour l’instant.',
  writeForDay: 'Écrire une entrée pour ce jour',
  newEntryOnDay: 'Nouvelle entrée pour ce jour',
  editEntryHint: 'Modifier l’entrée — ou touchez le texte',
  unsavedChanges: 'Modifications non enregistrées pour cette entrée',
  continueEditing: 'Continuer la modification',
  /** Shown when a day is opened from a search; `{query}` is what was searched for. */
  matches: plural({
    one: '{count} correspondance pour « {query} »',
    other: '{count} correspondances pour « {query} »',
  }),
  noMatchesHere: 'Aucune correspondance pour « {query} » ici',
  fullScreen: 'Plein écran',
  exitFullScreen: 'Quitter le plein écran',
  backToTop: 'Retour en haut',

  /* Entry feed (phones) */
  feed: 'Entrées',
  noEntriesYet: 'Aucune entrée pour l’instant',
  noEntriesYetHint: 'Touchez + pour écrire celle d’aujourd’hui, ou choisissez un jour dans le calendrier.',
  /** A feed row read out: `{day}` is its date, `{title}` the entry's title. */
  feedEntry: '{day} : {title}',
  /** The pinned month in the feed; `{month}` is the month shown. */
  openCalendar: '{month}, ouvrir le calendrier',

  /* Shared controls */
  /** Spoken name of a select: `{label}` is what is chosen, `{value}` the current choice. */
  selectValue: '{label} : {value}',
  working: 'En cours',
  /** A bar of the statistics charts that covers a week; `{day}` is its first day. */
  weekOf: 'Semaine du {day}',
};
