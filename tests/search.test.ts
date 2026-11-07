import { beforeEach, describe, expect, it } from 'vitest';
import { resetSearch, search as searchIn } from '../src/lib/search';
import type { DiaryEntry } from '../src/lib/types';

function entry(uid: string, title: string, content = '', date = new Date(2026, 0, 1)): DiaryEntry {
  return { uid, title, content, date };
}

let entries: DiaryEntry[] = [];
const index = (next: DiaryEntry[]) => (entries = next);
const search = (query: string, limit?: number) => searchIn(entries, query, limit);
const uids = (query: string) => search(query).map((hit) => hit.entry.uid).sort();

describe('search', () => {
  beforeEach(() => {
    resetSearch();
    index([]);
  });

  it('returns every matching entry by default', () => {
    index(
      Array.from({ length: 120 }, (_, index) =>
        entry(String(index), `Shared memory ${index}`),
      ),
    );

    expect(search('shared')).toHaveLength(120);
  });

  it('still honours an explicit result limit', () => {
    index(
      Array.from({ length: 30 }, (_, index) => entry(String(index), `Note ${index}`)),
    );

    expect(search('note', 7)).toHaveLength(7);
  });

  it('finds literal matches regardless of case and diacritics', () => {
    index([
      entry('one', 'Una CANCIÓN', 'El pingüino viajó a München.'),
      entry('two', 'Un día normal'),
    ]);

    expect(search('cancion').map((hit) => hit.entry.uid)).toEqual(['one']);
    expect(search('PINGUINO').map((hit) => hit.entry.uid)).toEqual(['one']);
    expect(search('munchen').map((hit) => hit.entry.uid)).toEqual(['one']);
  });

  it('matches the query as an exact phrase, not its separate words', () => {
    index([
      entry('phrase', 'Day', 'I have not yet decided.'),
      entry('wrapped', 'Day', 'Not\n  YET, but soon.'),
      entry('words', 'Day', 'Not today, maybe yet another time.'),
      entry('partial', 'Not a chance'),
    ]);

    expect(search('not yet').map((hit) => hit.entry.uid).sort()).toEqual(['phrase', 'wrapped']);
  });

  it('never matches a phrase across two fields', () => {
    index([entry('split', 'Not', 'yet')]);

    expect(search('not yet')).toEqual([]);
  });

  it('sorts hits newest first', () => {
    index([
      entry('old', 'Walk', '', new Date(2019, 4, 2)),
      entry('new', 'Walk', '', new Date(2025, 8, 9)),
      entry('mid', 'Walk', '', new Date(2022, 1, 1)),
    ]);

    expect(search('walk').map((hit) => hit.entry.uid)).toEqual(['new', 'mid', 'old']);
  });

  it('follows changes to the entries', () => {
    const one = entry('one', 'Draft idea');
    index([one]);
    expect(uids('idea')).toEqual(['one']);
    index([{ ...one, title: 'Rewritten' }, entry('two', 'Another idea')]);
    expect(uids('idea')).toEqual(['two']);
    expect(uids('idea x')).toEqual([]);
    index([]);
    expect(search('idea')).toEqual([]);
  });

  it('gives the same hits while typing as for the whole query at once', () => {
    index([
      entry('plain', 'Un café', 'Not\n\n yet'),
      entry('accent', 'Un cafe\u0301\u0302'),
      entry('other', 'Una cafetera', 'not yesterday'),
      entry('nfd', 'Año', 'cafe'),
    ]);
    const typed = (query: string) => {
      resetSearch();
      for (let n = 1; n < query.length; n++) search(query.slice(0, n));
      return uids(query);
    };
    for (const query of ['café', 'cafe', 'cafe\u0301\u0302', 'not yet', 'not yes', 'año', 'ano']) {
      resetSearch();
      expect(typed(query), query).toEqual(uids(query));
    }
  });

  it('lets accents in the query narrow the match, but not the other way round', () => {
    index([
      entry('plain', 'Mi papa'),
      entry('accent', 'Mi papá'),
      entry('decomposed', 'Mi papa\u0301'),
    ]);

    expect(uids('papa')).toEqual(['accent', 'decomposed', 'plain']);
    expect(uids('PAPÁ')).toEqual(['accent', 'decomposed']);
  });

  it('treats ñ as its own letter', () => {
    index([entry('ano', 'Ano'), entry('ano-tilde', 'Feliz AÑO'), entry('nfd', 'an\u0303o')]);

    expect(uids('ano')).toEqual(['ano']);
    expect(uids('año')).toEqual(['ano-tilde', 'nfd']);
  });
});
