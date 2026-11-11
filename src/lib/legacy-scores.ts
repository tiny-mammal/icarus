/**
 * TEMPORARY. Reads the day scores a diary once kept by hand inside its
 * entries, to bring them into the tracker, e.g. `(6) 2DAC` or `20DAC. (6)`:
 * the score, then the days in a row it has passed (A) or failed (S).
 *
 * Only the score is used. The run length is ignored on purpose (it can be
 * wrong, and the tracker counts runs from the scores itself); the letter and
 * the shape of the mark are what tell a real mark from a number in the text,
 * and the letter doubles as a check on the score: with 5 as the lowest pass,
 * `(3) 2DAC` has a typo in one of the two.
 *
 * Whatever is certain is imported as it is. Whatever is not (two different
 * scores in a day, a letter that disagrees, a mistyped mark) is left for the
 * person to read and decide, never guessed.
 *
 * To remove it once the diary is migrated: delete this file, its test,
 * `LegacyScoresDialog.svelte` and `e2e/legacy-scores.spec.ts`, then the
 * `legacyScoresOpen` flag and `importDayScores` in the store, `importScores`
 * in `tracker.ts`, the `multiTap` action and its use in `SettingsMenu.svelte`,
 * and the dialog in `App.svelte`.
 */
import { dateKey } from './date';
import { isInvalidDate } from './ical';
import { scoreOn } from './tracker';
import type { DayScore, DiaryEntry, Tracker } from './types';

/** The old marks were scored 1 to 10. */
export const LEGACY_SCALE = 10;
/** The lowest score the old marks called a pass. */
export const LEGACY_PASS_MARK = 5;

/** Where in an entry a mark was found. */
export type LegacyField = 'title' | 'content';

export interface LegacyHit {
  uid: string;
  field: LegacyField;
  /** The whole mark, score and all, as offsets into the field's text. */
  start: number;
  end: number;
  /** The number written as the score; null when the mark has none beside it. */
  score: number | null;
  /** Whether the mark says the day passed (A) or failed (S). */
  passed: boolean;
  /** Complete and well formed: both brackets, the days, the letter and the C. */
  clean: boolean;
}

// --- finding marks ------------------------------------------------------------

/** What may sit between the pieces of a mark: spaces and Markdown emphasis or escapes. */
const JUNK = String.raw`[\s*_\\]{0,6}`;
/** Within the letters only Markdown may sit, or "3 d a c" in a sentence would be a mark. */
const TIGHT = String.raw`[*_\\]{0,3}`;
/** Days in a row, `D`, `A` or `S`, and `C`; the days and the `C` may be missing. */
const TOKEN = new RegExp(
  String.raw`(\d{0,4})${JUNK}D${TIGHT}([AS])(?:${TIGHT}(C)(?![A-Za-z]))?`,
  'gi',
);
const SCORE_BEFORE = /([(\[]?)[\s*_\\]*(\d{1,3})[\s*_\\]*([)\]]?)[\s*_\\.,;:\-–—]*$/;
const SCORE_AFTER = /^[\s*_\\.,;:\-–—]*([(\[]?)[\s*_\\]*(\d{1,3})[\s*_\\]*([)\]]?)/;
const REACH = 16;

const isWordChar = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}]/u.test(char);

interface Score {
  value: number;
  /** Where the score starts and ends in the text. */
  start: number;
  end: number;
  brackets: number;
  wellFormed: boolean;
}

/** The score written just before a mark's `D…`, or just after it. */
function scoreBefore(text: string, at: number): Score | null {
  const from = Math.max(0, at - REACH);
  const found = SCORE_BEFORE.exec(text.slice(from, at));
  if (!found) return null;
  return {
    value: Number(found[2]),
    start: from + found.index + found[0].search(/[(\[\d]/),
    end: at,
    brackets: (found[1] ? 1 : 0) + (found[3] ? 1 : 0),
    wellFormed: found[1] === '(' && found[3] === ')',
  };
}

function scoreAfter(text: string, at: number): Score | null {
  const found = SCORE_AFTER.exec(text.slice(at, at + REACH));
  if (!found) return null;
  return {
    value: Number(found[2]),
    start: at,
    end: at + found[0].length,
    brackets: (found[1] ? 1 : 0) + (found[3] ? 1 : 0),
    wellFormed: found[1] === '(' && found[3] === ')',
  };
}

/**
 * Every mark in `text`. A mark is anchored on its `D` + `A`/`S` (+ `C`) token,
 * which plain numbers in an entry never look like; the score is the bracketed
 * number right before it or right after it. A token with a `C` but no score
 * is still reported, for someone to fill in; one without a `C` only counts
 * beside a bracketed score, or it would be any "3 da…".
 */
export function findLegacyMarks(text: string): Omit<LegacyHit, 'uid' | 'field'>[] {
  const marks: Omit<LegacyHit, 'uid' | 'field'>[] = [];
  for (const token of text.matchAll(TOKEN)) {
    const start = token.index!;
    const end = start + token[0].length;
    if (isWordChar(text[start - 1]) || isWordChar(text[end])) continue;

    const hasC = token[3] !== undefined;
    const before = scoreBefore(text, start);
    const after = scoreAfter(text, end);
    const score =
      before && before.brackets > 0 ? before : after && after.brackets > 0 ? after : null;
    if (!score && !hasC) continue;

    marks.push({
      start: score ? Math.min(score.start, start) : start,
      end: score ? Math.max(score.end, end) : end,
      score: score ? score.value : null,
      passed: token[2].toUpperCase() === 'A',
      clean: hasC && score !== null && score.wellFormed && token[1] !== '',
    });
  }
  return marks;
}

// --- planning the import -------------------------------------------------------

/** Why a day needs a person to look at it. */
export type ConflictReason =
  | 'missing' // a mark with no score beside it
  | 'range' // a score outside 1 to 10
  | 'letter' // the letter and the score disagree on whether it passed
  | 'differs' // more than one score for the day
  | 'unsure' // a mark with something off (a bracket or the C missing)
  | 'existing'; // the diary already scores the day differently

export interface LegacyConflict {
  /** `YYYY-MM-DD`. */
  key: string;
  reasons: ConflictReason[];
  hits: LegacyHit[];
  /** The one score the marks agree on, when there is one. */
  suggestion: number | null;
  /** What the diary already has for the day. */
  existing: DayScore | null;
}

export interface LegacyPlan {
  /** Days whose marks are certain and new: day key → score. */
  ready: Map<string, DayScore>;
  /** Days for a person to settle, oldest first. */
  conflicts: LegacyConflict[];
  /** Days already scored as the marks say. */
  unchanged: number;
  /** Days with at least one entry, to judge how many marks were found. */
  days: number;
}

const REASON_ORDER: ConflictReason[] = ['missing', 'range', 'letter', 'differs', 'unsure', 'existing'];

const isValid = (score: number | null): score is number =>
  score !== null && Number.isInteger(score) && score >= 1 && score <= LEGACY_SCALE;

/** The marks of every entry, grouped by the day they belong to. */
function hitsByDay(entries: readonly DiaryEntry[]): { hits: Map<string, LegacyHit[]>; days: number } {
  const hits = new Map<string, LegacyHit[]>();
  const days = new Set<string>();
  for (const entry of entries) {
    if (isInvalidDate(entry.date)) continue;
    const key = dateKey(entry.date);
    days.add(key);
    for (const field of ['title', 'content'] as const) {
      for (const mark of findLegacyMarks(entry[field])) {
        const list = hits.get(key) ?? [];
        list.push({ ...mark, uid: entry.uid, field });
        hits.set(key, list);
      }
    }
  }
  return { hits, days: days.size };
}

/** Sort the marks of `entries` into those to import and those to settle by hand. */
export function planLegacyScores(entries: readonly DiaryEntry[], tracker: Tracker): LegacyPlan {
  const { hits: byDay, days } = hitsByDay(entries);
  const plan: LegacyPlan = { ready: new Map(), conflicts: [], unchanged: 0, days };

  for (const [key, hits] of byDay) {
    const scores = [...new Set(hits.map((hit) => hit.score).filter(isValid))];
    const existing = tracker.days.get(key)?.score ?? null;
    const reasons = new Set<ConflictReason>();
    for (const hit of hits) {
      if (hit.score === null) reasons.add('missing');
      else if (!isValid(hit.score)) reasons.add('range');
      else {
        if (hit.passed !== hit.score >= LEGACY_PASS_MARK) reasons.add('letter');
        if (!hit.clean) reasons.add('unsure');
      }
    }
    if (scores.length > 1) reasons.add('differs');

    const only = scores.length === 1 ? scores[0] : null;
    const certain = reasons.size === 0 && only !== null;
    if (existing) {
      // Sure of the day and the diary says the same already: nothing to do.
      // Any other day that has a score is shown with it, doubtful or not, so
      // settling it is never an unnoticed overwrite.
      if (certain && Math.round(scoreOn(existing, LEGACY_SCALE)) === only) plan.unchanged++;
      else reasons.add('existing');
    } else if (certain) {
      plan.ready.set(key, { value: only, scale: LEGACY_SCALE });
    }
    if (reasons.size > 0) {
      plan.conflicts.push({
        key,
        reasons: REASON_ORDER.filter((reason) => reasons.has(reason)),
        hits,
        suggestion: only,
        existing,
      });
    }
  }
  plan.conflicts.sort((a, b) => (a.key < b.key ? -1 : 1));
  return plan;
}

// --- showing marks in their entry ------------------------------------------------

export interface MarkSegment {
  text: string;
  marked: boolean;
}

/** `text` cut into runs, those inside a mark flagged, for reading it in place. */
export function markSegments(text: string, hits: readonly Pick<LegacyHit, 'start' | 'end'>[]): MarkSegment[] {
  const segments: MarkSegment[] = [];
  let at = 0;
  for (const hit of [...hits].sort((a, b) => a.start - b.start)) {
    if (hit.start < at) continue; // overlapping marks show once
    if (hit.start > at) segments.push({ text: text.slice(at, hit.start), marked: false });
    segments.push({ text: text.slice(hit.start, hit.end), marked: true });
    at = hit.end;
  }
  if (at < text.length) segments.push({ text: text.slice(at), marked: false });
  return segments;
}
