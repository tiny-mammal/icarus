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

/** Everything one `.ics` file holds. */
export interface Diary {
  entries: DiaryEntry[];
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
