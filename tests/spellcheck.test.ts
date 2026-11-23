import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Schema, type Mark, type Node as PMNode } from '@tiptap/pm/model';
import {
  addUserWord,
  ensureSpellchecker,
  isCorrect,
  matchCase,
  misspelledRanges,
  parseUserWord,
  rankSuggestions,
  removeUserWord,
  setUserWords,
  shouldCheck,
  spellingWindow,
  suggest,
} from '../src/lib/spellcheck';

// A minimal schema (paragraphs with bold/code marks and hard breaks) is enough
// to exercise the range mapping without pulling in the whole editor.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline+', toDOM: () => ['p', 0] },
    text: { group: 'inline' },
    hard_break: { group: 'inline', inline: true, toDOM: () => ['br'] },
  },
  marks: {
    bold: { toDOM: () => ['strong', 0] },
    code: { toDOM: () => ['code', 0] },
  },
});

function para(...children: PMNode[]) {
  return schema.node('paragraph', null, children);
}

function text(value: string, marks: Mark[] = []) {
  return schema.text(value, marks);
}

describe('misspelledRanges', () => {
  it('maps misspelled words to positions (base is the first inline pos)', () => {
    const block = para(text('teh cat'));
    expect(misspelledRanges(block, 1, (word) => word !== 'teh')).toEqual([
      { from: 1, to: 4, word: 'teh' },
    ]);
  });

  it('checks a word split across text nodes as a single word', () => {
    const block = para(text('mis'), text('take', [schema.marks.bold.create()]));
    expect(misspelledRanges(block, 1, () => false)).toEqual([
      { from: 1, to: 8, word: 'mistake' },
    ]);
  });

  it('never joins words across a hard break', () => {
    const block = para(text('teh'), schema.node('hard_break'), text('cat'));
    expect(misspelledRanges(block, 1, () => false)).toEqual([
      { from: 1, to: 4, word: 'teh' },
      { from: 5, to: 8, word: 'cat' },
    ]);
  });

  it('underlines the word itself, not the apostrophes around it', () => {
    const block = para(text("dogs' teh"));
    expect(misspelledRanges(block, 1, () => false)).toEqual([
      { from: 1, to: 5, word: 'dogs' },
      { from: 7, to: 10, word: 'teh' },
    ]);
  });

  it('treats inline code as a word break', () => {
    const block = para(text('te'), text('h', [schema.marks.code.create()]));
    expect(misspelledRanges(block, 1, () => false).map((r) => r.word)).toEqual([
      'te',
    ]);
  });
});

describe('shouldCheck', () => {
  it('skips short, all-caps and camelCase words', () => {
    expect(shouldCheck('a')).toBe(false);
    expect(shouldCheck('NASA')).toBe(false);
    expect(shouldCheck('iPhone')).toBe(false);
    expect(shouldCheck('MÜLLER')).toBe(false);
    expect(shouldCheck('café')).toBe(true);
    expect(shouldCheck('Monday')).toBe(true);
    expect(shouldCheck('teh')).toBe(true);
    expect(shouldCheck("don't")).toBe(true);
  });
});

describe('rankSuggestions', () => {
  it('drops word splits when a one-word fix exists', () => {
    expect(rankSuggestions('occured', ['occurred', 'occur ed', 'occur-ed'])).toEqual(['occurred']);
    expect(rankSuggestions('alot', ['a lot'])).toEqual(['a lot']);
  });
});

describe('matchCase', () => {
  it('copies the capitalisation of the replaced word', () => {
    expect(matchCase('teh', 'the')).toBe('the');
    expect(matchCase('Teh', 'the')).toBe('The');
    expect(matchCase('TEH', 'the')).toBe('THE');
  });
});

describe('bundled dictionaries', () => {
  afterAll(() => ensureSpellchecker(['en']));

  it.each([
    ['en', ['diary', 'journal', "o'clock"], 'diery', 'diary'],
    ['es', ['mañana', 'caminábamos', 'canción'], 'cancion', 'canción'],
    ['it', ['domani', "dell'anno", 'perché'], 'citta', 'città'],
    ['fr', ['demain', "aujourd'hui", "l'homme"], 'ete', 'été'],
    ['de', ['Morgen', 'Straße', 'gehen'], 'Strase', 'Straße'],
  ] as const)('checks %s', async (locale, words, misspelled, suggestion) => {
    await ensureSpellchecker([locale]);
    for (const word of words) expect(isCorrect(word), word).toBe(true);
    expect(isCorrect(misspelled)).toBe(false);
    expect(suggest(misspelled)).toContain(suggestion);
  });

  it('accepts a word any of the chosen languages knows', async () => {
    await ensureSpellchecker(['es', 'en']);
    expect(isCorrect('mañana')).toBe(true);
    expect(isCorrect('tomorrow')).toBe(true);
    expect(isCorrect('cancion')).toBe(false);
    expect(suggest('cancion')[0]).toBe('canción');
  });

  it('teaches personal words to every dictionary in use', async () => {
    await ensureSpellchecker(['es', 'en']);
    setUserWords(['Zorblax']);
    expect(isCorrect('Zorblax')).toBe(true);
    await ensureSpellchecker(['de']);
    expect(isCorrect('Zorblax')).toBe(true);
    setUserWords([]);
  });

  it('leaves accented words alone in English only', async () => {
    await ensureSpellchecker(['en']);
    expect(isCorrect('Zoë')).toBe(true);
    await ensureSpellchecker(['es']);
    expect(isCorrect('Zoë')).toBe(false);
  });
});


describe('spellingWindow', () => {
  it('limits checking to the word around the edit', () => {
    const block = para(text('hello diery world'));
    expect(spellingWindow(block, 8, 9)).toEqual({ from: 6, to: 11 });
  });

  it('includes both words on either side of a newly inserted space', () => {
    const block = para(text('hello world'));
    expect(spellingWindow(block, 5, 6)).toEqual({ from: 0, to: 11 });
  });

  it('preserves inline positions across hard breaks', () => {
    const block = para(text('hello'), schema.node('hard_break'), text('diery'));
    expect(spellingWindow(block, 8, 9)).toEqual({ from: 6, to: 11 });
  });
});

describe('personal dictionary', () => {
  beforeAll(async () => {
    await ensureSpellchecker(['en']);
  });
  afterEach(() => setUserWords([]));

  it('accepts an added word and flags it again once removed', () => {
    expect(isCorrect('Zorblax')).toBe(false);
    expect(addUserWord('Zorblax')).toEqual(['Zorblax']);
    expect(isCorrect('Zorblax')).toBe(true);
    expect(removeUserWord('Zorblax')).toEqual([]);
    expect(isCorrect('Zorblax')).toBe(false);
  });

  it('returns the words sorted', () => {
    addUserWord('Zorblax');
    addUserWord('Quuxify');
    expect(removeUserWord('nothing')).toEqual(['Quuxify', 'Zorblax']);
  });

  it('never erases a stock word the user also added', () => {
    addUserWord('diary');
    removeUserWord('diary');
    expect(isCorrect('diary')).toBe(true);
  });

  it('forgets the previous words when the dictionary is replaced', () => {
    addUserWord('Zorblax');
    setUserWords(['Quuxify']);
    expect(isCorrect('Zorblax')).toBe(false);
    expect(isCorrect('Quuxify')).toBe(true);
  });
});

describe('parseUserWord', () => {
  it('accepts one word, tidying apostrophes and spaces', () => {
    expect(parseUserWord('  Zorblax ')).toBe('Zorblax');
    expect(parseUserWord('o’clock')).toBe("o'clock");
    expect(parseUserWord('well-being')).toBe('well-being');
  });

  it('rejects anything that is not a single checkable word', () => {
    for (const input of ['', '   ', 'a', 'two words', 'abc123', '42', 'hi!']) {
      expect(parseUserWord(input)).toBeNull();
    }
  });
});
