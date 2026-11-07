/**
 * Search-term highlighting helpers, shared by the reader pane. Two flavours:
 *  - `highlightSegments` splits plain text into matched / unmatched runs for
 *    declarative rendering (used for the title and location).
 *  - `highlightElement` walks the already-rendered Markdown DOM and wraps
 *    matches in `<mark>` in place (the body is injected via `{@html}`, so Svelte
 *    doesn't track its internals — safe to mutate).
 * Matching follows the same rule as `search`, so every hit shows exactly what
 * the user typed: case-insensitive, whitespace runs are interchangeable, and
 * accents are asymmetric — an unaccented query letter matches any accented
 * variant, while an accented one only matches itself. `ñ` is its own letter.
 */
import { flattenText, plainText, truncateText } from './text';

const HL_CLASS = 'search-hl';

export interface Segment {
  text: string;
  match: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface FoldedText {
  value: string;
  /** Original UTF-16 start/end offsets for every code unit in `value`. */
  starts: number[];
  ends: number[];
}

interface MatchRange {
  start: number;
  end: number;
}

const COMBINING_TILDE = '\u0303';
const MARK = /\p{M}/u;

/**
 * Lowercase and decompose letters into base + combining marks, keeping the
 * marks so the query decides how strictly they match. `ñ` is recomposed so it
 * stays distinct from `n`, and final sigma joins the regular form so folding a
 * whole string and folding it character by character agree.
 */
export function foldSearchText(text: string): string {
  return (text ?? '')
    .normalize('NFD')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/n\u0303/g, 'ñ');
}

/** Fold character by character while retaining original offsets. */
function foldText(text: string): FoldedText {
  let value = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;

  for (const character of text) {
    const end = offset + character.length;
    let folded = foldSearchText(character);
    // A standalone combining tilde after `n` turns it into `ñ`.
    if (folded.startsWith(COMBINING_TILDE) && value.endsWith('n')) {
      value = `${value.slice(0, -1)}ñ`;
      ends[ends.length - 1] = end;
      folded = folded.slice(COMBINING_TILDE.length);
    }
    value += folded;
    for (let i = 0; i < folded.length; i++) {
      starts.push(offset);
      ends.push(end);
    }
    offset = end;
  }

  return { value, starts, ends };
}

/**
 * The terms a raw query searches and highlights: the whole query as a single
 * exact phrase, or nothing when it is too short to be meaningful.
 */
export function queryTerms(query: string | null | undefined): string[] {
  const phrase = foldSearchText(query ?? '').replace(/\s+/g, ' ').trim();
  return phrase.replace(/\p{M}/gu, '').length >= 2 ? [phrase] : [];
}

/** Regex source for one folded term (see the matching rule above). */
function termPattern(term: string): string {
  let pattern = '';
  for (const cluster of term.match(/\P{M}\p{M}*/gu) ?? []) {
    if (/^\s+$/.test(cluster)) {
      pattern += '\\s+';
      continue;
    }
    const base = escapeRegExp(cluster[0]);
    const marks = cluster.slice(1);
    pattern += marks ? `${base}${marks}(?!\\p{M})` : `${base}\\p{M}*`;
  }
  return pattern;
}

/** Build a regex matching any term, or null when there is nothing to match. */
export function termsRegex(terms: string[], flags = 'gu'): RegExp | null {
  const foldedTerms = [
    ...new Set(terms.map((t) => foldSearchText(t).replace(/\s+/g, ' ').trim()).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);
  if (!foldedTerms.length) return null;
  return new RegExp(`(${foldedTerms.map(termPattern).join('|')})`, flags);
}

/** Locate folded matches and translate them back to exact source slices. */
function matchRanges(text: string, terms: string[]): MatchRange[] {
  const folded = foldText(text);
  const re = termsRegex(terms);
  if (!folded.value || !re) return [];

  const ranges: MatchRange[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(folded.value))) {
    const foldedEnd = match.index + match[0].length - 1;
    const start = folded.starts[match.index];
    let end = folded.ends[foldedEnd];
    if (start === undefined || end === undefined) continue;

    // Include combining marks stored as separate code points so the original
    // decorated letter is highlighted as a single visual unit.
    while (end < text.length) {
      const next = String.fromCodePoint(text.codePointAt(end) as number);
      if (!MARK.test(next)) break;
      end += next.length;
    }

    ranges.push({ start, end });
    if (match.index === re.lastIndex) re.lastIndex++;
  }
  return ranges;
}

/** Break `text` into matched/unmatched segments for declarative highlighting. */
export function highlightSegments(text: string, terms: string[]): Segment[] {
  if (!text) return [];
  const ranges = matchRanges(text, terms);
  if (!ranges.length) return [{ text, match: false }];

  const out: Segment[] = [];
  let last = 0;
  for (const range of ranges) {
    if (range.start > last) {
      out.push({ text: text.slice(last, range.start), match: false });
    }
    out.push({ text: text.slice(range.start, range.end), match: true });
    last = range.end;
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out;
}

/** How many term occurrences appear in `text`. */
export function countMatches(text: string, terms: string[]): number {
  return highlightSegments(text, terms).filter((s) => s.match).length;
}

/**
 * Extract a compact preview of `text` centred on the first occurrence of any
 * search term, clipped with ellipses where it was cut. This is what surfaces
 * the actual matching text in a result row (vs. always showing the opening
 * lines). Falls back to the start of the text when nothing matches literally.
 */
export function snippetAround(text: string, terms: string[], radius = 70): string {
  const clean = flattenText(plainText(text));
  if (!clean) return '';
  const match = matchRanges(clean, terms)[0];
  if (!match) return truncateText(clean, radius * 2);
  const start = Math.max(0, match.start - radius);
  const end = Math.min(clean.length, match.end + radius);
  return `${start > 0 ? '…' : ''}${clean.slice(start, end)}${end < clean.length ? '…' : ''}`;
}

/** Strip previously injected highlight marks, restoring plain text nodes. */
export function clearHighlights(root: HTMLElement): void {
  root.querySelectorAll(`mark.${HL_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  });
}

/**
 * Wrap term occurrences inside `root`'s text nodes with `<mark>`. Returns the
 * number of matches and the first mark element (for scroll-into-view).
 */
export function highlightElement(
  root: HTMLElement,
  terms: string[],
): { count: number; first: HTMLElement | null } {
  if (!termsRegex(terms)) return { count: 0, first: null };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.classList.contains(HL_CLASS)))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  // Collect first, mutate after — editing the tree mid-walk is unsafe.
  const targets: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) targets.push(node as Text);

  let count = 0;
  let first: HTMLElement | null = null;

  for (const textNode of targets) {
    const text = textNode.nodeValue ?? '';
    const ranges = matchRanges(text, terms);
    if (!ranges.length) continue;

    const frag = document.createDocumentFragment();
    let last = 0;
    for (const range of ranges) {
      if (range.start > last) {
        frag.appendChild(document.createTextNode(text.slice(last, range.start)));
      }
      const mark = document.createElement('mark');
      mark.className = HL_CLASS;
      mark.textContent = text.slice(range.start, range.end);
      frag.appendChild(mark);
      if (!first) first = mark;
      count++;
      last = range.end;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  return { count, first };
}
