import { describe, it, expect } from 'vitest';
import {
  countMatches,
  highlightSegments,
  snippetAround,
  queryTerms,
} from '../src/lib/highlight';

describe('queryTerms', () => {
  it('keeps the whole query as one folded phrase', () => {
    expect(queryTerms('  Not   YET  ')).toEqual(['not yet']);
    expect(queryTerms('Año\tFinal')).toEqual(['año final']);
  });

  it('drops empty and single-character queries', () => {
    expect(queryTerms('')).toEqual([]);
    expect(queryTerms('   ')).toEqual([]);
    expect(queryTerms(' a ')).toEqual([]);
  });

  it('handles nullish input safely', () => {
    expect(queryTerms(null)).toEqual([]);
    expect(queryTerms(undefined)).toEqual([]);
  });
});

describe('highlightSegments', () => {
  it('returns a single unmatched segment when no terms', () => {
    expect(highlightSegments('hello world', [])).toEqual([
      { text: 'hello world', match: false },
    ]);
  });

  it('marks case-insensitive matches', () => {
    expect(highlightSegments('Hello World', ['hello'])).toEqual([
      { text: 'Hello', match: true },
      { text: ' World', match: false },
    ]);
  });

  it('marks matches regardless of accents and diaereses', () => {
    expect(highlightSegments('Canción en MÜNCHEN', ['cancion', 'munchen'])).toEqual([
      { text: 'Canción', match: true },
      { text: ' en ', match: false },
      { text: 'MÜNCHEN', match: true },
    ]);
  });

  it('keeps decomposed combining marks inside the highlight', () => {
    const decomposed = 'cancio\u0301n';
    expect(highlightSegments(decomposed, ['cancion'])).toEqual([
      { text: decomposed, match: true },
    ]);
  });

  it('supports multiple terms (OR semantics)', () => {
    const segs = highlightSegments('the quick brown fox', ['quick', 'fox']);
    const matches = segs.filter((s) => s.match).map((s) => s.text.toLowerCase());
    expect(matches).toEqual(['quick', 'fox']);
  });

  it('treats terms as literal substrings, not regex', () => {
    // Parens / dots should be matched literally, not as regex metachars.
    const segs = highlightSegments('see (note) — version 1.0', ['1.0', '(note)']);
    const matches = segs.filter((s) => s.match).map((s) => s.text);
    expect(matches).toEqual(['(note)', '1.0']);
  });

  it('handles a zero-length match defensively (no infinite loop)', () => {
    // An empty term would otherwise match everywhere with zero width; the
    // implementation must not hang. We don't assert the exact output (it's
    // implementation-defined) — just that the call returns.
    const segs = highlightSegments('abc', ['']);
    expect(Array.isArray(segs)).toBe(true);
    expect(segs.length).toBeGreaterThan(0);
  });

  it('returns an empty array for empty input', () => {
    expect(highlightSegments('', ['foo'])).toEqual([]);
  });
});

describe('countMatches', () => {
  it('matches accents asymmetrically and keeps ñ distinct', () => {
    expect(countMatches('papa, papá, papà', queryTerms('papa'))).toBe(3);
    expect(countMatches('papa, papá, papà', queryTerms('papá'))).toBe(1);
    expect(countMatches('ano, año, AÑO, an\u0303o', queryTerms('año'))).toBe(3);
    expect(countMatches('ano, año', queryTerms('ano'))).toBe(1);
  });

  it('counts a phrase only where it appears whole, across line breaks too', () => {
    expect(countMatches('Not yet. Not now. not\n  yet', queryTerms('not yet'))).toBe(2);
  });


  it('counts the number of matched segments', () => {
    expect(countMatches('the cat sat on the mat', ['the'])).toBe(2);
    expect(countMatches('the cat sat on the mat', ['cat', 'mat'])).toBe(2);
    expect(countMatches('nothing here', ['cat'])).toBe(0);
  });
});

describe('snippetAround', () => {
  it('returns the cleaned text when there is no match', () => {
    expect(snippetAround('hello world', [])).toBe('hello world');
  });

  it('truncates long text with an ellipsis when no term matches', () => {
    const long = 'a'.repeat(200);
    const out = snippetAround(long, ['zzz']);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(140);
  });

  it('centres the snippet on the first match and pads with ellipses', () => {
    const text = ' '.repeat(100) + 'TARGET' + ' '.repeat(100) + 'rest';
    const out = snippetAround(text, ['target'], 10);
    expect(out).toContain('TARGET');
    expect(out.length).toBeLessThan(text.length);
  });

  it('centres snippets around accent-insensitive matches', () => {
    const out = snippetAround(`${'x'.repeat(50)} CÓRDOBA ${'y'.repeat(50)}`, ['cordoba'], 5);
    expect(out).toContain('CÓRDOBA');
  });

  it('does not add a leading ellipsis when the match is at the start', () => {
    const out = snippetAround('TARGET in the middle and then more text', ['target'], 5);
    expect(out.startsWith('TARGET')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
  });

  it('collapses whitespace before slicing', () => {
    const out = snippetAround('foo\n\n  bar  baz', ['baz'], 5);
    expect(out).toBe('… bar baz');
  });

  it('returns empty for empty input', () => {
    expect(snippetAround('', ['x'])).toBe('');
  });
});
