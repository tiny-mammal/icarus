// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { countVisible, indexAfterVisible } from '../src/lib/caret';

describe('visible-character offsets', () => {
  it('ignores whitespace, which the reader and editor lay out differently', () => {
    expect(countVisible('Hello  world\n')).toBe(10);
    expect(countVisible('')).toBe(0);
  });

  it('finds the index right after the n-th visible character', () => {
    const text = 'Hi there';
    expect(indexAfterVisible(text, 0)).toBe(0);
    expect(indexAfterVisible(text, 2)).toBe(2); // after "Hi"
    expect(indexAfterVisible(text, 3)).toBe(4); // after "Hi t"
    expect(indexAfterVisible(text, 7)).toBe(8);
  });

  it('reports texts that are too short', () => {
    expect(indexAfterVisible('abc', 4)).toBeNull();
  });

  it('round-trips between differently spaced copies of the same words', () => {
    const reader = 'Morning walk\nToday I petted a tiny mammal.';
    const editor = 'Morning walk Today I petted  a tiny mammal.';
    const tapped = reader.indexOf('petted') + 3; // inside "petted"
    const n = countVisible(reader.slice(0, tapped));
    expect(editor.slice(0, indexAfterVisible(editor, n)!)).toMatch(/pet$/);
  });
});
