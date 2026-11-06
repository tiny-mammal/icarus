import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSearchIndex,
  indexAddEntry,
  indexRemoveEntry,
  indexUpdateEntry,
  search,
} from '../src/lib/search';
import type { DiaryEntry } from '../src/lib/types';

function entry(uid: string, title: string, content = '', date = new Date(2026, 0, 1)): DiaryEntry {
  return { uid, title, content, date };
}

describe('search', () => {
  beforeEach(() => buildSearchIndex([]));

  it('returns every matching entry by default', () => {
    buildSearchIndex(
      Array.from({ length: 120 }, (_, index) =>
        entry(String(index), `Shared memory ${index}`),
      ),
    );

    expect(search('shared')).toHaveLength(120);
  });

  it('still honours an explicit result limit', () => {
    buildSearchIndex(
      Array.from({ length: 30 }, (_, index) => entry(String(index), `Note ${index}`)),
    );

    expect(search('note', 7)).toHaveLength(7);
  });

  it('finds literal matches regardless of case and diacritics', () => {
    buildSearchIndex([
      entry('one', 'Una CANCIÓN', 'El pingüino viajó a München.'),
      entry('two', 'Un día normal'),
    ]);

    expect(search('cancion').map((hit) => hit.entry.uid)).toEqual(['one']);
    expect(search('PINGUINO').map((hit) => hit.entry.uid)).toEqual(['one']);
    expect(search('munchen').map((hit) => hit.entry.uid)).toEqual(['one']);
  });

  it('matches the query as an exact phrase, not its separate words', () => {
    buildSearchIndex([
      entry('phrase', 'Day', 'I have not yet decided.'),
      entry('wrapped', 'Day', 'Not\n  YET, but soon.'),
      entry('words', 'Day', 'Not today, maybe yet another time.'),
      entry('partial', 'Not a chance'),
    ]);

    expect(search('not yet').map((hit) => hit.entry.uid).sort()).toEqual(['phrase', 'wrapped']);
  });

  it('never matches a phrase across two fields', () => {
    buildSearchIndex([entry('split', 'Not', 'yet')]);

    expect(search('not yet')).toEqual([]);
  });

  it('sorts hits newest first', () => {
    buildSearchIndex([
      entry('old', 'Walk', '', new Date(2019, 4, 2)),
      entry('new', 'Walk', '', new Date(2025, 8, 9)),
      entry('mid', 'Walk', '', new Date(2022, 1, 1)),
    ]);

    expect(search('walk').map((hit) => hit.entry.uid)).toEqual(['new', 'mid', 'old']);
  });

  it('keeps the index current through incremental updates', () => {
    buildSearchIndex([entry('one', 'Draft idea')]);
    indexAddEntry(entry('two', 'Another idea'));
    indexUpdateEntry(entry('one', 'Rewritten'));
    indexRemoveEntry('missing');

    expect(search('idea').map((hit) => hit.entry.uid)).toEqual(['two']);
    indexRemoveEntry('two');
    expect(search('idea')).toEqual([]);
  });

  it('lets accents in the query narrow the match, but not the other way round', () => {
    buildSearchIndex([
      entry('plain', 'Mi papa'),
      entry('accent', 'Mi papá'),
      entry('decomposed', 'Mi papa\u0301'),
    ]);

    const uids = (query: string) => search(query).map((hit) => hit.entry.uid).sort();
    expect(uids('papa')).toEqual(['accent', 'decomposed', 'plain']);
    expect(uids('PAPÁ')).toEqual(['accent', 'decomposed']);
  });

  it('treats ñ as its own letter', () => {
    buildSearchIndex([entry('ano', 'Ano'), entry('ano-tilde', 'Feliz AÑO'), entry('nfd', 'an\u0303o')]);

    const uids = (query: string) => search(query).map((hit) => hit.entry.uid).sort();
    expect(uids('ano')).toEqual(['ano']);
    expect(uids('año')).toEqual(['ano-tilde', 'nfd']);
  });
});
