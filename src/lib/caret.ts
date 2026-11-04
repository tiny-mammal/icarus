/**
 * Carry the caret from the reader to the editor when the user taps the text
 * they are reading. The two render the same words with different markup and
 * layout (the editing pane is wider, Markdown syntax differs from the HTML), so
 * the tap is described as "after the n-th visible character": whitespace is
 * ignored because the two disagree about it, the words themselves don't.
 */

const isVisible = (ch: string) => !/\s/.test(ch);

/** Count the non-whitespace characters in `text`. */
export function countVisible(text: string): number {
  let n = 0;
  for (const ch of text) if (isVisible(ch)) n++;
  return n;
}

/**
 * The index in `text` right after its `n`-th visible character (0 for n = 0),
 * or null when `text` holds fewer than `n` of them.
 */
export function indexAfterVisible(text: string, n: number): number | null {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (isVisible(text[i]) && ++seen === n) return i + 1;
  }
  return null;
}

/**
 * How many visible characters of `container` come before the viewport point
 * (x, y), or null if the point isn't on its text.
 */
export function visibleOffsetAt(container: Element, x: number, y: number): number | null {
  const caret = caretAt(x, y);
  if (!caret || !container.contains(caret.node)) return null;
  const range = document.createRange();
  range.setStart(container, 0);
  range.setEnd(caret.node, caret.offset);
  return countVisible(range.toString());
}

function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}
