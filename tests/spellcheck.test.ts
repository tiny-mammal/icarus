import { describe, expect, it } from 'vitest';
import nspell from 'nspell';
import { Schema, type Mark, type Node as PMNode } from '@tiptap/pm/model';
import aff from '../src/assets/spellcheck/en.aff?raw';
import dic from '../src/assets/spellcheck/en.dic?raw';
import {
  matchCase,
  misspelledRanges,
  shouldCheck,
  spellingWindow,
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
  it('skips short, all-caps, camelCase and non-ASCII words', () => {
    expect(shouldCheck('a')).toBe(false);
    expect(shouldCheck('NASA')).toBe(false);
    expect(shouldCheck('iPhone')).toBe(false);
    expect(shouldCheck('café')).toBe(false);
    expect(shouldCheck('Monday')).toBe(true);
    expect(shouldCheck('teh')).toBe(true);
    expect(shouldCheck("don't")).toBe(true);
  });
});

describe('matchCase', () => {
  it('copies the capitalisation of the replaced word', () => {
    expect(matchCase('teh', 'the')).toBe('the');
    expect(matchCase('Teh', 'the')).toBe('The');
    expect(matchCase('TEH', 'the')).toBe('THE');
  });
});

describe('bundled dictionary', () => {
  it('is a valid English Hunspell dictionary', () => {
    const spell = nspell(aff, dic);

    expect(spell.correct('diary')).toBe(true);
    expect(spell.correct('journal')).toBe(true);
    expect(spell.correct('diery')).toBe(false);
    expect(spell.suggest('diery')).toContain('diary');
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
