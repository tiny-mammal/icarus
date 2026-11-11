/** A single diary entry, mapped 1:1 to a VEVENT in the .ics file. */
export interface DiaryEntry {
  /** VEVENT UID — stable identity, used for de-dupe and updates. */
  uid: string;
  /** SUMMARY — the entry title. */
  title: string;
  /** DESCRIPTION — the entry body, authored in Markdown. */
  content: string;
  /** LOCATION — an optional subtitle (user repurposes this field). */
  location?: string;
  /** DTSTART — the day the entry belongs to (date-only; time is ignored). */
  date: Date;
  /**
   * Properties and subcomponents of the VEVENT that Icarus doesn't use, as
   * iCalendar text written back verbatim, so saving never drops them.
   */
  extra?: string;
}

/** A daily habit. Archived habits keep their history but leave the day's list. */
export interface Habit {
  id: string;
  name: string;
  archived?: boolean;
}

/** How a habit went on one day. A habit not marked at all has no mark. */
export type HabitMark = 'done' | 'missed';

/** A day's score, kept with the scale it was given on. */
export interface DayScore {
  value: number;
  scale: number;
}

/** What was tracked on one day, apart from its entries. */
export interface DayRecord {
  score?: DayScore;
  /** Habit id → how the day went. */
  marks: Readonly<Record<string, HabitMark>>;
  /** Habit id → a streak length set by hand on this day; counting goes on from it. */
  streaks: Readonly<Record<string, number>>;
  /** iCalendar text Icarus doesn't use, written back verbatim. */
  extra?: string;
}

/** What a day without a mark does to a streak: nothing, or end it. */
export type UnmarkedDays = 'pause' | 'end';

/** Habits, day scores and how streaks are counted. */
export interface Tracker {
  habits: readonly Habit[];
  /** Keyed by `YYYY-MM-DD`. */
  days: ReadonlyMap<string, DayRecord>;
  /** Highest score a day can get (the lowest is 1). */
  scoreScale: number;
  unmarkedDays: UnmarkedDays;
  /** Show how many days in a row the score passed, or failed. */
  passStreak: boolean;
  /** Lowest passing score on the current scale; half of it when unset. */
  passMark?: number;
}

/** Everything one `.ics` file holds. */
export interface Diary {
  entries: DiaryEntry[];
  /** Absent for a diary that has never tracked anything. */
  tracker?: Tracker;
  /**
   * Calendar properties and components (other than entries) that Icarus
   * doesn't use, as iCalendar text written back verbatim. Properties come
   * first, as the format requires.
   */
  extra?: string;
}

/**
 * A draft persisted to disk so half-written entries survive a crash, power
 * loss, or simply closing the app. Many can coexist; `id` is the stable key.
 */
export interface StoredDraft {
  id: string;
  /** UID of the committed entry this draft is revising, when applicable. */
  editingUid?: string;
  title: string;
  location: string;
  content: string;
  /** ISO `YYYY-MM-DD`. */
  dateKey: string;
  /** Epoch ms of the last edit — used to sort the drafts list. */
  updatedAt: number;
}

/** A typed result so callers can react to parse failures without throwing. */
export type ParseResult =
  | ({ ok: true } & Diary)
  | { ok: false; error: string };

/** Severity levels for user-facing toasts. */
export type ToastLevel = 'info' | 'success' | 'error';

/** An optional inline action rendered as a button inside a toast (e.g. Undo). */
export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  level: ToastLevel;
  message: string;
  action?: ToastAction;
}
