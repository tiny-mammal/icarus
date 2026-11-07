import { describe, expect, it } from 'vitest';
import { flattenText, plainText, previewText } from '../src/lib/text';

const flat = (md: string) => flattenText(plainText(md));

describe('plainText', () => {
  it('drops block markers but keeps their words', () => {
    expect(flat('## Notes\n> quoted\n- one\n* [x] done\n1. first')).toBe('Notes quoted one, done, first');
  });

  it('drops lines that are only syntax', () => {
    expect(flat('before\n---\n```js\ncode\n```\nafter')).toBe('before code after');
  });

  it('keeps the words of emphasis, code and links', () => {
    expect(flat('**bold** and *it* or _it_ ~~gone~~ `x = 1`')).toBe('bold and it or it gone x = 1');
    expect(flat('see [the docs](https://x.y) ![a cat](cat.png) <https://a.b>')).toBe(
      'see the docs a cat https://a.b',
    );
  });

  it('leaves plain asterisks, underscores and escapes readable', () => {
    expect(flat('snake_case_name, 2 * 3 * 4, \\*literal\\*')).toBe('snake_case_name, 2 * 3 * 4, *literal*');
  });

  it('joins list items with commas, unless they already end a clause', () => {
    expect(flat('Today:\n- one small thing\n- another.\n- last\n\nAfter')).toBe(
      'Today: one small thing, another. last After',
    );
  });
});

describe('previewText', () => {
  it('flattens and clips the plain text', () => {
    expect(previewText('A **long** walk home', 10)).toBe('A long wa…');
  });

  it('leaves headings out, unless they are all there is', () => {
    expect(previewText('## Notes\nToo tired to write.', 80)).toBe('Too tired to write.');
    expect(previewText('# Just a heading', 80)).toBe('Just a heading');
  });
});
