import { plural } from '../../format';

/** Navigation and shared controls: top bar, calendars, day pane, feed, search, pickers and dialogs. */
export default {
  /* Top bar */
  search: 'Cerca',
  searchEntries: 'Cerca voci',
  searchPlaceholder: 'Cerca voci…',
  clearSearch: 'Cancella ricerca',
  closeSearch: 'Chiudi ricerca',
  statistics: 'Statistiche',
  lockDiary: 'Blocca diario',
  settings: 'Impostazioni',
  settingsUpdateAvailable: 'Impostazioni, aggiornamento disponibile',
  settingsUpdateAvailableHint: 'Impostazioni · aggiornamento disponibile',

  /* Search results */
  noMatchingEntries: 'Nessuna voce corrispondente',
  results: plural({ one: '{count} risultato', other: '{count} risultati' }),
  /** `{shown}` of the `{count}` results are listed so far. */
  showingResults: plural({
    one: 'Mostrato {shown} di {count} risultato',
    other: 'Mostrati {shown} di {count} risultati',
  }),
  newestFirst: 'Più recenti prima',
  oldestFirst: 'Meno recenti prima',
  /** Button naming the order now in use and what pressing it does. */
  showNewestFirst: 'Meno recenti prima, mostra le più recenti',
  showOldestFirst: 'Più recenti prima, mostra le meno recenti',

  /* Calendars */
  previousMonth: 'Mese precedente',
  nextMonth: 'Mese successivo',
  previousYear: 'Anno precedente',
  nextYear: 'Anno successivo',
  selectMonthAndYear: 'Seleziona mese e anno',
  /** Jumps to the current day or month. */
  today: 'Oggi',
  /** A day in the calendar, read out in full: `{day}` is the date, `{titles}` the entry titles. */
  dayWithEntries: plural({
    one: '{day}, {count} voce: {titles}',
    other: '{day}, {count} voci: {titles}',
  }),
  /** Last line of a calendar cell whose entries do not all fit; `{count}` is how many are hidden. */
  moreEntries: '+{count} altre',
  /** A day in the small calendar: its date followed by what is special about it. */
  dayHasEntries: 'con voci',
  dayRangeStart: 'inizio intervallo',
  dayRangeEnd: 'fine intervallo',
  daySelected: 'selezionato',

  /* Date pickers */
  pickDate: 'Scegli una data',
  rangeEnds: 'Estremi dell’intervallo',
  /** The two ends of a date range: the first day and the last day. */
  rangeFrom: 'Dal',
  rangeTo: 'Al',
  pickDay: 'Scegli un giorno',
  pickFirstDay: 'Scegli il primo giorno',
  pickLastDay: 'Scegli l’ultimo giorno',
  /** Days of the chosen range that hold at least one entry. */
  rangeDaysWithEntries: '{count} con voci',
  rangeNothingWritten: 'Niente scritto',
  apply: 'Applica',

  /* Day pane */
  previousDay: 'Giorno precedente',
  nextDay: 'Giorno successivo',
  noEarlierEntries: 'Nessuna voce precedente',
  noLaterEntries: 'Nessuna voce successiva',
  /** Hints on the day arrows; `{day}` is the day they lead to. */
  previousDayHint: 'Giorno precedente · {day}',
  nextDayHint: 'Giorno successivo · {day}',
  previousEntry: 'Voce precedente',
  nextEntry: 'Voce successiva',
  /** Dot under the entry pager; `{number}` counts from 1. */
  goToEntry: 'Vai alla voce {number}',
  noEntriesOnDay: 'Nessuna voce in questo giorno.',
  writeForDay: 'Scrivi una voce per questo giorno',
  newEntryOnDay: 'Nuova voce per questo giorno',
  editEntryHint: 'Modifica voce — oppure tocca il testo',
  unsavedChanges: 'Modifiche non salvate a questa voce',
  continueEditing: 'Continua a modificare',
  /** Shown when a day is opened from a search; `{query}` is what was searched for. */
  matches: plural({
    one: '{count} corrispondenza per “{query}”',
    other: '{count} corrispondenze per “{query}”',
  }),
  noMatchesHere: 'Nessuna corrispondenza per “{query}” qui',
  fullScreen: 'Schermo intero',
  exitFullScreen: 'Esci da schermo intero',
  backToTop: 'Torna su',

  /* Entry feed (phones) */
  feed: 'Voci',
  noEntriesYet: 'Nessuna voce ancora',
  noEntriesYetHint: 'Tocca + per scrivere quella di oggi, oppure scegli un giorno dal calendario.',
  /** A feed row read out: `{day}` is its date, `{title}` the entry's title. */
  feedEntry: '{day}: {title}',
  /** The pinned month in the feed; `{month}` is the month shown. */
  openCalendar: '{month}, apri calendario',

  /* Shared controls */
  /** Spoken name of a select: `{label}` is what is chosen, `{value}` the current choice. */
  selectValue: '{label}: {value}',
  working: 'In corso',
  /** A bar of the statistics charts that covers a week; `{day}` is its first day. */
  weekOf: 'Settimana del {day}',
};
