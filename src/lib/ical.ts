/**
 * The iCalendar layer. All `.ics` reading/writing goes through here so the rest
 * of the app only ever deals with the clean {@link DiaryEntry} model.
 *
 * Reads with `ical.js` (per spec) and writes its own few properties directly.
 * Parsing is fully defensive: a corrupt or partial
 * file yields a typed error rather than throwing, so the UI can stay alive and
 * keep whatever data is already in memory.
 */
import ICAL from 'ical.js';
import type { DiaryEntry, ParseResult } from './types';
import { randomId } from './random';

const PRODID = '-//Icarus Diary//Local-First Diary//EN';

/** Generate a stable, iCal-style UID for a new entry. */
export function generateUid(): string {
  return `${randomId()}@icarus.diary`;
}

/** Coerce an ical.js property value to a trimmed string (or undefined). */
function str(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

type JCalProperty = [name: string, params: object, type: string, ...values: unknown[]];
type JCalComponent = [name: string, properties: JCalProperty[], components: JCalComponent[]];

/** The first value of property `name`, as ical.js decoded it. */
function firstValue(properties: JCalProperty[], name: string): unknown {
  return properties.find((p) => p[0] === name)?.[3];
}

const DATE_VALUE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Read the calendar date off a DTSTART value. We pull the literal calendar
 * components (year/month/day) rather than converting through a timezone to
 * avoid drift across midnight — the diary is day-granular by design.
 *
 * Returns `null` if the value is missing or unparseable. Callers MUST handle
 * that case explicitly (we never want to silently re-date a corrupt entry to
 * "today" — the original day would be lost the next time we persist).
 */
function dtToDate(property: JCalProperty | undefined): Date | null {
  if (!property || (property[2] !== 'date' && property[2] !== 'date-time')) return null;
  const match = typeof property[3] === 'string' ? DATE_VALUE.exec(property[3]) : null;
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/**
 * Parse raw `.ics` text into entries. Never throws — returns a typed result.
 *
 * Reads ical.js's jCal arrays directly: wrapping every property of years of
 * entries in `ICAL.Component`/`Property`/`Time` objects costs more than the
 * parse itself, and opening the diary waits on this.
 */
export function parseIcs(text: string): ParseResult {
  // An empty / whitespace-only file is a valid "no entries yet" state.
  if (!text || !text.trim()) return { ok: true, entries: [] };

  try {
    const jcal = ICAL.parse(text) as JCalComponent | JCalComponent[];
    // Several calendars concatenated into one file parse as a list of them.
    const roots = typeof jcal[0] === 'string' ? [jcal as JCalComponent] : (jcal as JCalComponent[]);

    let invalidDates = 0;
    const entries: DiaryEntry[] = [];
    for (const root of roots) {
      for (const [name, props] of root[2] ?? []) {
        if (name !== 'vevent') continue;
        let date = dtToDate(props.find((p) => p[0] === 'dtstart'));
        if (!date) {
          // Unreadable DTSTART: keep the entry (so the user doesn't lose its
          // title/content) but flag it with a sentinel date and bump a counter.
          // `serializeIcs` writes the sentinel back out as-is rather than
          // silently rewriting it to "today" on the next save.
          invalidDates++;
          date = new Date(INVALID_DATE_SENTINEL);
        }
        entries.push({
          uid: str(firstValue(props, 'uid')) ?? generateUid(),
          title: str(firstValue(props, 'summary')) ?? 'Untitled',
          content: str(firstValue(props, 'description')) ?? '',
          location: str(firstValue(props, 'location')),
          date,
        });
      }
    }

    if (invalidDates > 0) {
      // Surface the warning on the console so the operator can see it; the
      // app itself stays alive and the entries are not silently lost.
      console.warn(
        `[ical] ${invalidDates} entr${invalidDates === 1 ? 'y has' : 'ies have'} an unparseable DTSTART — kept with placeholder date.`,
      );
    }

    return { ok: true, entries };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    return { ok: false, error: message };
  }
}

/**
 * Sentinel year used to mark entries whose DTSTART could not be parsed.
 *
 * Year 9999 is used because (a) it round-trips cleanly through the
 * iCalendar serialization used here, and (b) it is so far outside the range
 * of any real diary entry that we can detect it deterministically without
 * any extra metadata on the entry. JS Date handles it (with a UTC offset in
 * the printed string) and ical.js writes `VALUE=DATE:99990101` and reads it
 * back identically.
 */
export const INVALID_DATE_SENTINEL_YEAR = 9999;
const INVALID_DATE_SENTINEL = new Date(INVALID_DATE_SENTINEL_YEAR, 0, 1).getTime();

/** Whether `date` is the placeholder used for unparseable DTSTARTs. */
export function isInvalidDate(date: Date): boolean {
  return date.getFullYear() === INVALID_DATE_SENTINEL_YEAR;
}

// --- writing ---------------------------------------------------------------
// The diary is written whole on every save, so this is a direct writer for
// the few properties Icarus uses instead of ical.js's general one (which
// builds an object per property and folds lines in quadratic time). Its
// output is byte-for-byte what ical.js writes; the tests hold it to that.

const CRLF = '\r\n';
/** Longest content line in UTF-8 bytes before folding (RFC 5545 §3.1). */
const FOLD_BYTES = 75;
const TEXT_SPECIALS = /[\\;,\n]/g;

function escapeText(value: string): string {
  return value.replace(TEXT_SPECIALS, (c) => (c === '\n' ? '\\n' : `\\${c}`));
}

/** Split `line` into segments of at most FOLD_BYTES, never inside a character. */
function fold(line: string): string {
  // Short lines can't reach the limit even at 4 bytes per character.
  if (line.length <= FOLD_BYTES / 4) return line;
  let out = '';
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < line.length; ) {
    const cp = line.codePointAt(i)!;
    const size = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + size > FOLD_BYTES) {
      out += (start ? CRLF + ' ' : '') + line.slice(start, i);
      start = i;
      bytes = 0;
    }
    bytes += size;
    i += cp > 0xffff ? 2 : 1;
  }
  return start ? `${out}${CRLF} ${line.slice(start)}` : line;
}

function textLine(name: string, value: string): string {
  return fold(`${name}:${escapeText(value)}`);
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function icsDate(d: Date): string {
  return `${pad(d.getFullYear(), 4)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Local "floating" date-time, as ical.js writes `ICAL.Time.now()`. */
function icsDateTime(d: Date): string {
  return `${icsDate(d)}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Serialize entries to valid `.ics` text. DTSTART is written as a date-only
 * value (VALUE=DATE) since entries belong to a day, not a moment.
 */
export function serializeIcs(entries: DiaryEntry[]): string {
  const stamp = `DTSTAMP:${icsDateTime(new Date())}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    textLine('PRODID', PRODID),
    'CALSCALE:GREGORIAN',
  ];
  for (const e of entries) {
    lines.push(
      'BEGIN:VEVENT',
      textLine('UID', e.uid),
      stamp,
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      textLine('SUMMARY', e.title),
    );
    if (e.content) lines.push(textLine('DESCRIPTION', e.content));
    if (e.location) lines.push(textLine('LOCATION', e.location));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join(CRLF);
}
