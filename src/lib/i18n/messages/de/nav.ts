import { plural } from '../../format';

/** Navigation and shared controls: top bar, calendars, day pane, feed, search, pickers and dialogs. */
export default {
  /* Top bar */
  search: 'Suchen',
  searchEntries: 'Einträge durchsuchen',
  searchPlaceholder: 'Einträge durchsuchen…',
  clearSearch: 'Suche leeren',
  closeSearch: 'Suche schließen',
  statistics: 'Statistik',
  lockDiary: 'Tagebuch sperren',
  settings: 'Einstellungen',
  settingsUpdateAvailable: 'Einstellungen, Update verfügbar',
  settingsUpdateAvailableHint: 'Einstellungen · Update verfügbar',

  /* Search results */
  noMatchingEntries: 'Keine passenden Einträge',
  results: plural({ one: '{count} Treffer', other: '{count} Treffer' }),
  /** `{shown}` of the `{count}` results are listed so far. */
  showingResults: plural({
    one: '{shown} von {count} Treffer wird angezeigt',
    other: '{shown} von {count} Treffern werden angezeigt',
  }),
  newestFirst: 'Neueste zuerst',
  oldestFirst: 'Älteste zuerst',
  /** Button naming the order now in use and what pressing it does. */
  showNewestFirst: 'Älteste zuerst, neueste zuerst anzeigen',
  showOldestFirst: 'Neueste zuerst, älteste zuerst anzeigen',

  /* Calendars */
  previousMonth: 'Vorheriger Monat',
  nextMonth: 'Nächster Monat',
  previousYear: 'Vorheriges Jahr',
  nextYear: 'Nächstes Jahr',
  selectMonthAndYear: 'Monat und Jahr auswählen',
  /** Jumps to the current day or month. */
  today: 'Heute',
  /** A day in the calendar, read out in full: `{day}` is the date, `{titles}` the entry titles. */
  dayWithEntries: plural({
    one: '{day}, {count} Eintrag: {titles}',
    other: '{day}, {count} Einträge: {titles}',
  }),
  /** Last line of a calendar cell whose entries do not all fit; `{count}` is how many are hidden. */
  moreEntries: '+{count} weitere',
  /** A day in the small calendar: its date followed by what is special about it. */
  dayHasEntries: 'hat Einträge',
  dayRangeStart: 'Beginn des Zeitraums',
  dayRangeEnd: 'Ende des Zeitraums',
  daySelected: 'ausgewählt',

  /* Date pickers */
  pickDate: 'Datum wählen',
  rangeEnds: 'Zeitraumgrenzen',
  /** The two ends of a date range: the first day and the last day. */
  rangeFrom: 'Von',
  rangeTo: 'Bis',
  pickDay: 'Tag wählen',
  pickFirstDay: 'Ersten Tag wählen',
  pickLastDay: 'Letzten Tag wählen',
  /** Days of the chosen range that hold at least one entry. */
  rangeDaysWithEntries: '{count} mit Einträgen',
  rangeNothingWritten: 'Nichts geschrieben',
  apply: 'Übernehmen',

  /* Day pane */
  previousDay: 'Vorheriger Tag',
  nextDay: 'Nächster Tag',
  noEarlierEntries: 'Keine früheren Einträge',
  noLaterEntries: 'Keine späteren Einträge',
  /** Hints on the day arrows; `{day}` is the day they lead to. */
  previousDayHint: 'Vorheriger Tag · {day}',
  nextDayHint: 'Nächster Tag · {day}',
  previousEntry: 'Vorheriger Eintrag',
  nextEntry: 'Nächster Eintrag',
  /** Dot under the entry pager; `{number}` counts from 1. */
  goToEntry: 'Zu Eintrag {number} springen',
  noEntriesOnDay: 'An diesem Tag gibt es noch keine Einträge.',
  writeForDay: 'Schreibe einen Eintrag für diesen Tag',
  newEntryOnDay: 'Neuer Eintrag an diesem Tag',
  editEntryHint: 'Eintrag bearbeiten — oder auf den Text tippen',
  unsavedChanges: 'Nicht gespeicherte Änderungen an diesem Eintrag',
  continueEditing: 'Weiter bearbeiten',
  /** Shown when a day is opened from a search; `{query}` is what was searched for. */
  matches: plural({
    one: '{count} Treffer für „{query}“',
    other: '{count} Treffer für „{query}“',
  }),
  noMatchesHere: 'Keine Treffer für „{query}“ hier',
  fullScreen: 'Vollbild',
  exitFullScreen: 'Vollbild beenden',
  backToTop: 'Nach oben',

  /* Entry feed (phones) */
  feed: 'Einträge',
  noEntriesYet: 'Noch keine Einträge',
  noEntriesYetHint: 'Tippe auf +, um den heutigen zu schreiben, oder wähle im Kalender einen Tag aus.',
  /** A feed row read out: `{day}` is its date, `{title}` the entry's title. */
  feedEntry: '{day}: {title}',
  /** The pinned month in the feed; `{month}` is the month shown. */
  openCalendar: '{month}, Kalender öffnen',

  /* Shared controls */
  /** Spoken name of a select: `{label}` is what is chosen, `{value}` the current choice. */
  selectValue: '{label}: {value}',
  working: 'Wird verarbeitet',
  /** A bar of the statistics charts that covers a week; `{day}` is its first day. */
  weekOf: 'Woche vom {day}',
};
