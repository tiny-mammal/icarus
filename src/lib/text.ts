/**
 * Plain-text helpers shared by the search snippet, the drafts list preview, the
 * entry feed and anywhere else that needs to turn a Markdown body into a
 * compact one-liner. Centralised so "drop the Markdown syntax, flatten
 * whitespace, then clip with an ellipsis" lives in exactly one place.
 */

// Block syntax at the start of a line: quotes, headings, list and task markers.
const BLOCK_PREFIX = /^\s*(?:>\s*)*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)?/;
// Lines that are only syntax: code fences and horizontal rules.
const SYNTAX_LINE = /^\s*(?:`{3,}.*|~{3,}.*|(?:[-*_]\s*){3,})$/;

/**
 * The readable text of a Markdown body, for previews: block markers, emphasis,
 * code ticks and link targets go, their words stay. Line breaks are kept (a
 * flatten afterwards joins them). Not a full parser: previews only need the
 * common syntax gone, and this runs for every visible row.
 */
export function plainText(markdown: string): string {
  return (markdown ?? '')
    .split('\n')
    .map((line) => (SYNTAX_LINE.test(line) ? '' : line.replace(BLOCK_PREFIX, '')))
    .join('\n')
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
  return truncateText(plainText(markdown), max);
}
