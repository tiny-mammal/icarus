/**
 * Length of an entry as the reader sees it: Markdown syntax (`**`, `# `, link
 * targets, list markers…) doesn't count, emoji and accented letters count once
 * each. Shared by the editor's live counter and the statistics, so the two
 * always agree. Regex-based rather than a full Markdown parse because the
 * statistics run it over every entry of a many-year diary.
 */

const FENCE = /^[ \t]*(?:```|~~~).*$/gm;
const BLOCK_PREFIX =
  /^[ \t]*(?:(?:>[ \t]?)+)?(?:#{1,6}[ \t]+|(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)?/gm;
const RULE = /^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm;
const LINK = /!?\[([^\]\n]*)\]\([^)\n]*\)/g;
// One pass so an escaped marker (`\*`) survives as the literal it stands for,
// while emphasis, strike and code markers vanish. Underscores only count as
// markers at a word edge, so `snake_case` keeps its own.
const INLINE = /\\([!-/:-@[-`{-~])|\*+|~~|`+|_+/g;
const WORD_CHAR = /[\p{L}\p{N}]/u;
const EDGE_SPACE = /[ \t]+$|\\$|^[ \t]+/gm; // indentation, trailing space, hard breaks
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/** The visible text of a Markdown entry, one line per source line. */
export function plainText(markdown: string): string {
  // Fenced code keeps its text as written; only the rest is unmarked.
  if (!/^[ \t]*(?:```|~~~)/m.test(markdown)) return unmark(markdown);
  let inCode = false;
  return markdown
    .split(FENCE)
    .map((chunk, i) => {
      if (i > 0) inCode = !inCode;
      return inCode ? chunk.replace(EDGE_SPACE, '') : unmark(chunk);
    })
    .join('');
}

function unmark(text: string): string {
  return text
    .replace(RULE, '')
    .replace(BLOCK_PREFIX, '')
    .replace(LINK, '$1')
    .replace(INLINE, keepLiteral)
    .replace(EDGE_SPACE, '');
}

function keepLiteral(match: string, escaped: string | undefined, at: number, text: string): string {
  if (escaped) return escaped;
  if (match[0] !== '_') return '';
  // An underscore between two letters is part of a word, not emphasis.
  const inWord = WORD_CHAR.test(text[at - 1] ?? '') && WORD_CHAR.test(text[at + match.length] ?? '');
  return inWord ? match : '';
}

/** Characters (code points) of the visible text, line breaks excluded. */
export function countChars(markdown: string): number {
  const text = plainText(markdown);
  let n = text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // Line breaks don't count; a surrogate pair is one character, not two.
    if (c === 10 || (c >= 0xdc00 && c <= 0xdfff)) n--;
  }
  return n;
}

/** Words of the visible text: runs of letters and digits, contractions included. */
export function countWords(markdown: string): number {
  return plainText(markdown).match(WORD)?.length ?? 0;
}
