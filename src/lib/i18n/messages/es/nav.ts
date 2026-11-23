import { plural } from '../../format';

/** Navigation and shared controls: top bar, calendars, day pane, feed, search, pickers and dialogs. */
export default {
  /* Top bar */
  search: 'Buscar',
  searchEntries: 'Buscar entradas',
  searchPlaceholder: 'Buscar entradas…',
  clearSearch: 'Borrar búsqueda',
  closeSearch: 'Cerrar búsqueda',
  statistics: 'Estadísticas',
  lockDiary: 'Bloquear diario',
  settings: 'Ajustes',
  settingsUpdateAvailable: 'Ajustes, actualización disponible',
  settingsUpdateAvailableHint: 'Ajustes · actualización disponible',

  /* Search results */
  noMatchingEntries: 'No hay entradas que coincidan',
  results: plural({ one: '{count} resultado', other: '{count} resultados' }),
  /** `{shown}` of the `{count}` results are listed so far. */
  showingResults: plural({
    one: 'Mostrando {shown} de {count} resultado',
    other: 'Mostrando {shown} de {count} resultados',
  }),
  newestFirst: 'Más recientes primero',
  oldestFirst: 'Más antiguas primero',
  /** Button naming the order now in use and what pressing it does. */
  showNewestFirst: 'Más antiguas primero, mostrar más recientes primero',
  showOldestFirst: 'Más recientes primero, mostrar más antiguas primero',

  /* Calendars */
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  previousYear: 'Año anterior',
  nextYear: 'Año siguiente',
  selectMonthAndYear: 'Elegir mes y año',
  /** Jumps to the current day or month. */
  today: 'Hoy',
  /** A day in the calendar, read out in full: `{day}` is the date, `{titles}` the entry titles. */
  dayWithEntries: plural({
    one: '{day}, {count} entrada: {titles}',
    other: '{day}, {count} entradas: {titles}',
  }),
  /** Last line of a calendar cell whose entries do not all fit; `{count}` is how many are hidden. */
  moreEntries: '+{count} más',
  /** A day in the small calendar: its date followed by what is special about it. */
  dayHasEntries: 'tiene entradas',
  dayRangeStart: 'inicio del rango',
  dayRangeEnd: 'fin del rango',
  daySelected: 'seleccionado',

  /* Date pickers */
  pickDate: 'Elige una fecha',
  rangeEnds: 'Extremos del rango',
  /** The two ends of a date range: the first day and the last day. */
  rangeFrom: 'Desde',
  rangeTo: 'Hasta',
  pickDay: 'Elige un día',
  pickFirstDay: 'Elige el primer día',
  pickLastDay: 'Elige el último día',
  /** Days of the chosen range that hold at least one entry. */
  rangeDaysWithEntries: '{count} con entradas',
  rangeNothingWritten: 'Nada escrito',
  apply: 'Aplicar',

  /* Day pane */
  previousDay: 'Día anterior',
  nextDay: 'Día siguiente',
  noEarlierEntries: 'No hay entradas anteriores',
  noLaterEntries: 'No hay entradas posteriores',
  /** Hints on the day arrows; `{day}` is the day they lead to. */
  previousDayHint: 'Día anterior · {day}',
  nextDayHint: 'Día siguiente · {day}',
  previousEntry: 'Entrada anterior',
  nextEntry: 'Entrada siguiente',
  /** Dot under the entry pager; `{number}` counts from 1. */
  goToEntry: 'Ir a la entrada {number}',
  noEntriesOnDay: 'Aún no hay entradas este día.',
  writeForDay: 'Escribe una entrada para este día',
  newEntryOnDay: 'Nueva entrada de este día',
  editEntryHint: 'Editar entrada, o toca el texto',
  unsavedChanges: 'Cambios sin guardar en esta entrada',
  continueEditing: 'Seguir editando',
  /** Shown when a day is opened from a search; `{query}` is what was searched for. */
  matches: plural({
    one: '{count} coincidencia para “{query}”',
    other: '{count} coincidencias para “{query}”',
  }),
  noMatchesHere: 'No hay coincidencias para “{query}” aquí',
  fullScreen: 'Pantalla completa',
  exitFullScreen: 'Salir de pantalla completa',
  backToTop: 'Volver arriba',

  /* Entry feed (phones) */
  feed: 'Entradas',
  noEntriesYet: 'Aún no hay entradas',
  noEntriesYetHint: 'Toca + para escribir la de hoy, o elige un día del calendario.',
  /** A feed row read out: `{day}` is its date, `{title}` the entry's title. */
  feedEntry: '{day}: {title}',
  /** The pinned month in the feed; `{month}` is the month shown. */
  openCalendar: '{month}, abrir calendario',

  /* Shared controls */
  /** Spoken name of a select: `{label}` is what is chosen, `{value}` the current choice. */
  selectValue: '{label}: {value}',
  working: 'Procesando',
  /** A bar of the statistics charts that covers a week; `{day}` is its first day. */
  weekOf: 'Semana del {day}',
};
