/**
 * Local, instant exact-phrase search over all entries — no network, fully
 * air-gapped. The matching rule (case, accents, whitespace) is shared with
 * highlighting in `highlight.ts`. Results are sorted newest first.
 *
 * Built for years of entries on slow phones:
 *  - Each entry gets a flat haystack (folded, accents stripped, whitespace
 *    collapsed), cached by
 *    entry identity: entries are immutable, so an edit is simply a new object
 *    and nothing has to be kept in sync. `warmSearch` fills the cache in idle
 *    time after a diary opens, so the first keystroke doesn't pay for it.
 *  - A query without accents (nearly all of them) is a native `includes` per
 *    entry. An accented one adds the exact regex, run only on the entries
 *    that pass that cheap shortlist.
 *  - Entries are kept newest first, so hits come out sorted.
 *  - Typing onward from the previous query only rescans its hits.
 */
import type { DiaryEntry } from './types';
import { foldSearchText, queryTerms, termsRegex } from './highlight';

export interface SearchHit {
  entry: DiaryEntry;
}

/** Which end of the diary the results start from (user preference). */
export const SEARCH_ORDERS = ['newest', 'oldest'] as const;
export type SearchOrder = (typeof SEARCH_ORDERS)[number];

export function parseSearchOrder(value: unknown): SearchOrder {
  return SEARCH_ORDERS.includes(value as SearchOrder) ? (value as SearchOrder) : 'newest';
}

interface Haystack {
  /** Folded, accents stripped, whitespace runs collapsed to one space. */
  plain: string;
  /** Folded with accents kept, built only once an accented query needs it. */
  folded?: string;
}

let haystacks = new WeakMap<DiaryEntry, Haystack>();
/** The searched entries newest first, for the array they came from. */
let ordered: { source: readonly DiaryEntry[]; entries: DiaryEntry[] } | null = null;
/** The last query's matches, to narrow down from as the user keeps typing. */
let last: { source: readonly DiaryEntry[]; phrase: string; matches: DiaryEntry[] } | null = null;
/** Bumped to stop a warm-up that no longer applies. */
let generation = 0;

// A separator no query can match, so a phrase never spans two fields.
const FIELD_SEPARATOR = '\u0000';
const MARKS = /\p{M}/gu;
// Latin accents, stripped by a plain (fast) regex. Text with code points past
// that block may hold other marks and takes the full Unicode pass.
const LATIN_MARKS = /[\u0300-\u036f]/g;
const BEYOND_LATIN = /[^\u0000-\u036f]/;
// Only whitespace that isn't already a single space: far fewer replacements
// than every run, which matters over years of text.
const IRREGULAR_SPACE = /\s\s+|[^\S ]/g;

function stripMarks(text: string): string {
  const stripped = text.replace(LATIN_MARKS, '');
  return BEYOND_LATIN.test(stripped) ? stripped.replace(MARKS, '') : stripped;
}

function foldedFields(entry: DiaryEntry): string {
  return [entry.title, entry.location ?? '', entry.content]
    .map(foldSearchText)
    .join(FIELD_SEPARATOR);
}

function haystack(entry: DiaryEntry): Haystack {
  let hay = haystacks.get(entry);
  if (!hay) {
    const plain = stripMarks(foldedFields(entry)).replace(IRREGULAR_SPACE, ' ');
    haystacks.set(entry, (hay = { plain }));
  }
  return hay;
}

function folded(entry: DiaryEntry): string {
  const hay = haystack(entry);
  hay.folded ??= foldedFields(entry);
  return hay.folded;
}

function newestFirst(entries: readonly DiaryEntry[]): DiaryEntry[] {
  if (ordered?.source !== entries) {
    ordered = {
      source: entries,
      entries: [...entries].sort((a, b) => b.date.getTime() - a.date.getTime()),
    };
  }
  return ordered.entries;
}

/**
 * Whether every match of `phrase` also matches `previous`, so its hits can be
 * narrowed down instead of scanning everything. Typing on keeps that true,
 * except for adding a mark to an already accented letter, which the previous
 * (strict) pattern rejects.
 */
function narrows(phrase: string, previous: string): boolean {
  if (!phrase.startsWith(previous)) return false;
  return !(/\p{M}$/u.test(previous) && /^\p{M}/u.test(phrase.slice(previous.length)));
}

/** A predicate telling whether an entry contains `phrase` (a folded query). */
function matcher(phrase: string): (entry: DiaryEntry) => boolean {
  const needle = stripMarks(phrase);
  // Accents in the query are strict: the plain haystack only shortlists, and
  // the exact pattern runs on that shortlist.
  const accented = needle !== phrase ? termsRegex([phrase], 'u') : null;
  return (entry) =>
    haystack(entry).plain.includes(needle) && (!accented || accented.test(folded(entry)));
}

/**
 * Entries containing the query as an exact phrase, newest first. Returns every
 * hit unless an explicit limit is set.
 */
export function search(entries: readonly DiaryEntry[], query: string, limit?: number): SearchHit[] {
  const [phrase] = queryTerms(query);
  if (!phrase) return [];

  const narrowing = last?.source === entries && narrows(phrase, last.phrase);
  const pool = narrowing && last ? last.matches : newestFirst(entries);
  const matches = pool.filter(matcher(phrase));
  last = { source: entries, phrase, matches };

  const hits = matches.map((entry) => ({ entry }));
  return limit === undefined ? hits : hits.slice(0, limit);
}

/**
 * Index `entries` in small slices while the app is idle, so the first search
 * after opening a diary is as fast as the rest.
 */
export function warmSearch(entries: readonly DiaryEntry[], sliceMs = 8): void {
  const run = ++generation;
  let next = 0;
  const step = () => {
    if (run !== generation) return;
    const until = performance.now() + sliceMs;
    while (next < entries.length && performance.now() < until) haystack(entries[next++]);
    if (next < entries.length) setTimeout(step, 0);
  };
  setTimeout(step, 0);
}

/** Forget every cached haystack and result, e.g. when the diary locks. */
export function resetSearch(): void {
  generation++;
  haystacks = new WeakMap();
  ordered = null;
  last = null;
}
