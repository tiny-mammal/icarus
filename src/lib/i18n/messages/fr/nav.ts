import { plural } from '../../format';

/** Navigation and shared controls: top bar, calendars, day pane, feed, search, pickers and dialogs. */
export default {
  /* Top bar */
  search: 'Search',
  searchEntries: 'Search entries',
  searchPlaceholder: 'Search entries…',
  clearSearch: 'Clear search',
  closeSearch: 'Close search',
  statistics: 'Statistics',
  lockDiary: 'Lock diary',
  settings: 'Settings',
  settingsUpdateAvailable: 'Settings, update available',
  settingsUpdateAvailableHint: 'Settings · update available',

  /* Search results */
  noMatchingEntries: 'No matching entries',
  results: plural({ one: '{count} result', other: '{count} results' }),
  /** `{shown}` of the `{count}` results are listed so far. */
  showingResults: plural({
    one: 'Showing {shown} of {count} result',
    other: 'Showing {shown} of {count} results',
  }),
  newestFirst: 'Newest first',
  oldestFirst: 'Oldest first',
  /** Button naming the order now in use and what pressing it does. */
  showNewestFirst: 'Oldest first, show newest first',
  showOldestFirst: 'Newest first, show oldest first',

  /* Calendars */
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  selectMonthAndYear: 'Select month and year',
  /** Jumps to the current day or month. */
  today: 'Today',
  /** A day in the calendar, read out in full: `{day}` is the date, `{titles}` the entry titles. */
  dayWithEntries: plural({
    one: '{day}, {count} entry: {titles}',
    other: '{day}, {count} entries: {titles}',
  }),
  /** Last line of a calendar cell whose entries do not all fit; `{count}` is how many are hidden. */
  moreEntries: '+{count} more',
  /** A day in the small calendar: its date followed by what is special about it. */
  dayHasEntries: 'has entries',
  dayRangeStart: 'range start',
  dayRangeEnd: 'range end',
  daySelected: 'selected',

  /* Date pickers */
  pickDate: 'Pick a date',
  rangeEnds: 'Range ends',
  /** The two ends of a date range: the first day and the last day. */
  rangeFrom: 'From',
  rangeTo: 'To',
  pickDay: 'Pick a day',
  pickFirstDay: 'Pick the first day',
  pickLastDay: 'Pick the last day',
  /** Days of the chosen range that hold at least one entry. */
  rangeDaysWithEntries: '{count} with entries',
  rangeNothingWritten: 'Nothing written',
  apply: 'Apply',

  /* Day pane */
  previousDay: 'Previous day',
  nextDay: 'Next day',
  noEarlierEntries: 'No earlier entries',
  noLaterEntries: 'No later entries',
  /** Hints on the day arrows; `{day}` is the day they lead to. */
  previousDayHint: 'Previous day · {day}',
  nextDayHint: 'Next day · {day}',
  previousEntry: 'Previous entry',
  nextEntry: 'Next entry',
  /** Dot under the entry pager; `{number}` counts from 1. */
  goToEntry: 'Go to entry {number}',
  noEntriesOnDay: 'No entries on this day yet.',
  writeForDay: 'Write an entry for this day',
  newEntryOnDay: 'New entry on this day',
  editEntryHint: 'Edit entry — or tap the text',
  unsavedChanges: 'Unsaved changes to this entry',
  continueEditing: 'Continue editing',
  /** Shown when a day is opened from a search; `{query}` is what was searched for. */
  matches: plural({
    one: '{count} match for “{query}”',
    other: '{count} matches for “{query}”',
  }),
  noMatchesHere: 'No matches for “{query}” here',
  fullScreen: 'Full screen',
  exitFullScreen: 'Exit full screen',
  backToTop: 'Back to top',

  /* Entry feed (phones) */
  feed: 'Entries',
  noEntriesYet: 'No entries yet',
  noEntriesYetHint: "Tap + to write today's, or pick a day from the calendar.",
  /** A feed row read out: `{day}` is its date, `{title}` the entry's title. */
  feedEntry: '{day}: {title}',
  /** The pinned month in the feed; `{month}` is the month shown. */
  openCalendar: '{month}, open calendar',

  /* Shared controls */
  /** Spoken name of a select: `{label}` is what is chosen, `{value}` the current choice. */
  selectValue: '{label}: {value}',
  working: 'Working',
  /** A bar of the statistics charts that covers a week; `{day}` is its first day. */
  weekOf: 'Week of {day}',
};
