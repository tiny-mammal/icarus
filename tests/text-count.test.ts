import { describe, expect, it } from 'vitest';
import {
  countChars,
  countWords,
  formatLength,
  lengthLabel,
  parseLengthCount,
  plainText,
} from '../src/lib/text-count';

describe('plainText', () => {
  it('drops inline and block Markdown syntax', () => {
    expect(plainText('# Title\n> **bold** and _it_ ~~gone~~ `code`')).toBe(
      'Title\nbold and it gone code',
    );
  });

  it('keeps link and image text, not their targets', () => {
    expect(plainText('see [the docs](https://x.y) ![a cat](cat.png)')).toBe('see the docs a cat');
  });

  it('drops list and task markers and horizontal rules', () => {
    expect(plainText('- one\n2. two\n- [x] done\n---')).toBe('one\ntwo\ndone\n');
  });

  it('keeps escaped markers and underscores inside words', () => {
    expect(plainText('2 \\* 3 in snake_case')).toBe('2 * 3 in snake_case');
  });

  it('leaves code blocks as written', () => {
    expect(plainText('```\n**x**\n```')).toBe('\n**x**\n');
  });
});

describe('countChars', () => {
  it('counts visible characters, spaces included, line breaks not', () => {
    expect(countChars('**hi** there\n\nyou')).toBe(11);
  });

  it('counts an emoji or accented letter once', () => {
    expect(countChars('día 🙂')).toBe(5);
  });

  it('is zero for an empty entry', () => {
    expect(countChars('')).toBe(0);
  });
});

describe('countWords', () => {
  it('counts words, keeping contractions and hyphenated words whole', () => {
    expect(countWords("It's a **well-known** fact — 42 times.")).toBe(6);
  });

  it('ignores syntax and punctuation on their own', () => {
    expect(countWords('- [ ] \n---\n* * *')).toBe(0);
  });
});

describe('formatLength', () => {
  it('shows words and characters, singular when there is one', () => {
    expect(formatLength('**Hi**')).toBe('1 word · 2 chars');
    expect(formatLength('a')).toBe('1 word · 1 char');
  });

  it('counts only what the preference shows', () => {
    expect(formatLength('**Hi** there', 'words')).toBe('2 words');
    expect(formatLength('**Hi** there', 'chars')).toBe('8 chars');
    expect(formatLength('**Hi** there', 'off')).toBe('');
  });
});

describe('lengthLabel', () => {
  const count = { words: 1, chars: 1200 };

  it('writes only what the preference shows', () => {
    expect(lengthLabel(count, 'words')).toBe('1 word');
    expect(lengthLabel(count, 'chars')).toBe(`${(1200).toLocaleString()} chars`);
    expect(lengthLabel(count, 'both')).toBe(`1 word · ${(1200).toLocaleString()} chars`);
    expect(lengthLabel(count, 'off')).toBe('');
  });

  it('falls back to both counts for unknown saved values', () => {
    expect(parseLengthCount('chars')).toBe('chars');
    expect(parseLengthCount(undefined)).toBe('both');
    expect(parseLengthCount('pages')).toBe('both');
  });
});
