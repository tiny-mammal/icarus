/**
 * Plain-text helpers shared by the search snippet, the drafts list preview, the
 * entry feed and anywhere else that needs to turn a Markdown body into a
 * compact one-liner. Centralised so "drop the Markdown syntax, flatten
 * whitespace, then clip with an ellipsis" lives in exactly one place.
 */

// Block markers at the start of a line. Quotes go first, then one of these.
const QUOTE = /^\s*(?:>\s*)*/;
const HEADING = /^#{1,6}\s+/;
const LIST_ITEM = /^(?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/;
// Lines that are only syntax: code fences and horizontal rules.
const SYNTAX_LINE = /^\s*(?:`{3,}.*|~{3,}.*|(?:[-*_]\s*){3,})$/;
// Text already ending a clause, so no comma is added after it.
const ENDS_CLAUSE = /[.,;:!?…]$/;

export interface PlainTextOptions {
  /**
   * Leave headings out: in a preview they are labels ("Notes"), not what was
   * written. Kept when the body holds nothing else.
   */
  dropHeadings?: boolean;
}

/**
 * The readable text of a Markdown body: block markers, emphasis, code ticks
 * and link targets go, their words stay. Consecutive list items are joined
 * with commas so they still read as a list once flattened; other lines keep
 * their breaks. Not a full parser: previews only need the common syntax gone,
 * and this runs for every visible row.
 */
export function plainText(markdown: string, { dropHeadings = false }: PlainTextOptions = {}): string {
  const lines = (markdown ?? '')
    .split('\n')
    .filter((line) => !SYNTAX_LINE.test(line))
    .map((line) => {
      const text = line.replace(QUOTE, '');
      if (HEADING.test(text)) return { kind: 'heading', text: text.replace(HEADING, '') };
      if (LIST_ITEM.test(text)) return { kind: 'item', text: text.replace(LIST_ITEM, '') };
      return { kind: 'text', text };
    })
    .filter((line) => line.text.trim());
  const kept =
    dropHeadings && lines.some((line) => line.kind !== 'heading')
      ? lines.filter((line) => line.kind !== 'heading')
      : lines;

  let out = '';
  kept.forEach((line, i) => {
    const prev = kept[i - 1];
    if (prev) {
      const listGoesOn = prev.kind === 'item' && line.kind === 'item';
      out += listGoesOn && !ENDS_CLAUSE.test(prev.text.trimEnd()) ? ', ' : '\n';
    }
    out += line.text.trim();
  });
  return inlineText(out);
}

/** Drop inline Markdown (links, code, emphasis, escapes), keeping the words. */
function inlineText(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links and images keep their text
    .replace(/<((?:https?|mailto):[^>\s]+)>/g, '$1') // autolinks
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(\*\*|__|~~)(\S(?:.*?\S)?)\1/g, '$2')
    .replace(/(^|[^\w*\\])([*_])(\S(?:.*?\S)?)\2(?![\w*])/g, '$1$3')
    .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1');
}

/** Collapse every run of whitespace to a single space and trim the ends. */
export function flattenText(text: string): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Flatten `text` and clip it to at most `max` characters, appending an ellipsis
 * where it was cut. Already-flat input is fine — flattening is idempotent.
 */
export function truncateText(text: string, max: number): string {
  const flat = flattenText(text);
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** A one-line preview of a Markdown body, at most `max` characters. */
export function previewText(markdown: string, max: number): string {
  return truncateText(plainText(markdown, { dropHeadings: true }), max);
}
