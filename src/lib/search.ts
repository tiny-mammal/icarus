/**
 * Local, instant exact-phrase search over all entries. Each entry keeps a
 * pre-folded haystack, so a query is a single regex scan per entry — no
 * network, fully air-gapped. The matching rule (case, accents, whitespace) is
 * shared with highlighting in `highlight.ts`. Results are sorted newest first.
 * The index is maintained incrementally by the store.
 */
import type { DiaryEntry } from './types';
import { foldSearchText, queryTerms, termsRegex } from './highlight';

export interface SearchHit {
  entry: DiaryEntry;
}

interface IndexedEntry {
  entry: DiaryEntry;
  haystack: string;
}

let index: Map<string, IndexedEntry> | null = null;

// A separator no query can match, so a phrase never spans two fields.
const FIELD_SEPARATOR = '\u0000';

function indexed(entry: DiaryEntry): IndexedEntry {
  const haystack = [entry.title, entry.location ?? '', entry.content]
    .map(foldSearchText)
    .join(FIELD_SEPARATOR);
  return { entry, haystack };
}

/** (Re)build the search index from scratch — used on vault load / forget. */
export function buildSearchIndex(entries: DiaryEntry[]): void {
  index = new Map(entries.map((entry) => [entry.uid, indexed(entry)]));
}

/**
 * Incremental index maintenance. These are no-ops if the index hasn't been
 * built yet (the next `buildSearchIndex` will pick up the current entries).
 */
export function indexAddEntry(entry: DiaryEntry): void {
  index?.set(entry.uid, indexed(entry));
}

export function indexRemoveEntry(uid: string): void {
  index?.delete(uid);
}

export function indexUpdateEntry(entry: DiaryEntry): void {
  indexAddEntry(entry);
}

/**
 * Entries containing the query as an exact phrase, newest first. Returns every
 * hit unless an explicit limit is set.
 */
export function search(query: string, limit?: number): SearchHit[] {
  const re = termsRegex(queryTerms(query), 'u');
  if (!re || !index) return [];

  const hits: SearchHit[] = [];
  for (const { entry, haystack } of index.values()) {
    if (re.test(haystack)) hits.push({ entry });
  }
  hits.sort((a, b) => b.entry.date.getTime() - a.entry.date.getTime());

  return limit === undefined ? hits : hits.slice(0, limit);
}
