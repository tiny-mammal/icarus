/**
 * Offline spell checking backed by Hunspell (compiled to WebAssembly by
 * `hunspell-asm`) and bundled dictionaries for every app language. Native
 * spell check looks and behaves differently on every platform (and Linux needs
 * system dictionaries installed), so the editor runs its own checker and
 * paints the underline itself — the same everywhere.
 *
 * The dictionaries (`src/assets/spellcheck/<lang>.aff|dic`, see the README
 * next to them) weigh 0.5–1.3 MB each, so only the one in use is fetched, the
 * first time checking is needed; they stay out of the boot path. Until it
 * loads, every word counts as correct and nothing is underlined.
 *
 * This module owns the engine and the pure word/position helpers; the TipTap
 * plugin that turns those ranges into underlines lives in
 * `spellcheck-extension.ts`.
 */
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Hunspell, HunspellFactory } from 'hunspell-asm';
import { DEFAULT_LOCALE, type Locale } from './i18n/locales';

/** Letters plus internal apostrophes/hyphens make up a checkable word. */
const WORD_RE = /\p{L}[\p{L}'’-]*/gu;
/** Below this many letters a "word" is never worth flagging. */
const MIN_LENGTH = 2;
/** How many suggestions the menu offers. */
const MAX_SUGGESTIONS = 6;

const AFFIXES = import.meta.glob<string>('../assets/spellcheck/*.aff', { query: '?raw', import: 'default' });
const WORDS = import.meta.glob<string>('../assets/spellcheck/*.dic', { query: '?raw', import: 'default' });

interface Speller {
  locale: Locale;
  hunspell: Hunspell;
  /** The mounted dictionary files, freed with the speller. */
  files: string[];
}

let factory: Promise<HunspellFactory> | null = null;
let speller: Speller | null = null;
/** The language asked for last, and the load answering it. */
let wanted: { locale: Locale; load: Promise<void> } | null = null;

/** Personal dictionary, restored from settings (Add to dictionary). */
const userWords = new Set<string>();
/**
 * The personal words taught to the engine. A word the dictionary already knows
 * is never taught, so forgetting it later cannot erase the stock entry.
 */
const learned = new Set<string>();
/** Words ignored for this session only (Ignore in the menu). */
const ignoredWords = new Set<string>();
/** Verdict cache, cleared whenever the dictionary or ignore list changes. */
const verdicts = new Map<string, boolean>();

async function createSpeller(locale: Locale): Promise<Speller> {
  const [hunspellAsm, aff, dic] = await Promise.all([
    (factory ??= import('hunspell-asm').then((m) => m.loadModule())),
    AFFIXES[`../assets/spellcheck/${locale}.aff`](),
    WORDS[`../assets/spellcheck/${locale}.dic`](),
  ]);
  const encoder = new TextEncoder();
  const files = [
    hunspellAsm.mountBuffer(encoder.encode(aff), `${locale}.aff`),
    hunspellAsm.mountBuffer(encoder.encode(dic), `${locale}.dic`),
  ];
  return { locale, hunspell: hunspellAsm.create(files[0], files[1]), files };
}

function disposeSpeller(old: Speller): void {
  old.hunspell.dispose();
  void factory?.then((hunspellAsm) => old.files.forEach((file) => hunspellAsm.unmount(file)));
}

/**
 * Load the dictionary for `locale` now (idempotent), replacing the one in
 * use. Resolves once checking in that language can happen.
 */
export function ensureSpellchecker(locale: Locale = DEFAULT_LOCALE): Promise<void> {
  if (wanted?.locale === locale) return wanted.load;
  const load = createSpeller(locale).then(
    (next) => {
      // A later call asked for another language meanwhile.
      if (wanted?.locale !== locale) return disposeSpeller(next);
      if (speller) disposeSpeller(speller);
      speller = next;
      learned.clear();
      syncSpeller();
    },
    (err) => {
      // Let a later attempt retry instead of caching the failure forever.
      if (wanted?.locale === locale) wanted = null;
      throw err;
    },
  );
  wanted = { locale, load };
  return load;
}

/** Bring the engine in line with the personal dictionary and drop stale verdicts. */
function syncSpeller(): void {
  verdicts.clear();
  if (!speller) return;
  for (const word of learned) {
    if (userWords.has(word)) continue;
    speller.hunspell.removeWord(word);
    learned.delete(word);
  }
  for (const word of userWords) {
    if (learned.has(word) || speller.hunspell.spell(word)) continue;
    speller.hunspell.addWord(word);
    learned.add(word);
  }
}

function sortedUserWords(): string[] {
  return [...userWords].sort((a, b) => a.localeCompare(b));
}

/** Replace the personal dictionary (on boot, and when another diary is opened). */
export function setUserWords(words: string[]): void {
  userWords.clear();
  for (const word of words) userWords.add(normalize(word));
  syncSpeller();
}

/** Add one word to the personal dictionary; returns the updated word list. */
export function addUserWord(word: string): string[] {
  userWords.add(normalize(word));
  syncSpeller();
  return sortedUserWords();
}

/** Remove one word from the personal dictionary; returns the updated word list. */
export function removeUserWord(word: string): string[] {
  userWords.delete(normalize(word));
  syncSpeller();
  return sortedUserWords();
}

/**
 * The word a typed entry stands for, or null when it is not one single
 * checkable word (spaces, digits, punctuation, a lone letter).
 */
export function parseUserWord(input: string): string | null {
  const word = normalize(input.trim());
  const whole = word.match(WORD_RE);
  return whole?.length === 1 && whole[0] === word && word.length >= MIN_LENGTH ? word : null;
}

/** Ignore a word for the rest of the session. */
export function ignoreWord(word: string): void {
  ignoredWords.add(normalize(word).toLowerCase());
  verdicts.clear();
}

/** Case-matched suggestions for a misspelled word (best effort). */
export function suggest(raw: string): string[] {
  if (!speller) return [];
  const word = normalize(raw);
  return rankSuggestions(word, speller.hunspell.suggest(word)).map((s) => matchCase(word, s));
}

/**
 * Hunspell also proposes splitting the word ("occured" → "occur ed"), which
 * is rarely meant when a one-word fix exists: keep splits only as a last
 * resort ("alot" → "a lot"). Exported for tests.
 */
export function rankSuggestions(word: string, suggestions: string[]): string[] {
  const isSplit = (s: string) => /[ -]/.test(s) && s.replace(/[ -]/g, '') === word.replace(/-/g, '');
  const whole = suggestions.filter((s) => !isSplit(s));
  return (whole.length ? whole : suggestions).slice(0, MAX_SUGGESTIONS);
}

/**
 * Whether `word` is spelled correctly. While the dictionary is loading (or
 * unavailable) everything counts as correct, so nothing is ever underlined by
 * mistake.
 */
export function isCorrect(raw: string): boolean {
  if (!speller) return true;
  const word = normalize(raw);
  if (word.length < MIN_LENGTH) return true;
  if (ignoredWords.has(word.toLowerCase())) return true;

  const cached = verdicts.get(word);
  if (cached !== undefined) return cached;

  const correct = checkWord(word);
  verdicts.set(word, correct);
  return correct;
}

function checkWord(word: string): boolean {
  const { hunspell, locale } = speller!;
  // The English dictionary has no accented words to speak of, so non-ASCII
  // text in English (names, borrowed words) would only produce false positives.
  if (locale === 'en' && /[^\p{ASCII}]/u.test(word)) return true;
  if (hunspell.spell(word)) return true;
  // Compound terms ("well-being") are fine when every part is a word.
  return word.includes('-') && word.split('-').every((part) => part === '' || hunspell.spell(part));
}

/**
 * Words we deliberately never flag: too short, all-caps acronyms and
 * camelCase product names. Exported for tests.
 */
export function shouldCheck(word: string): boolean {
  const core = normalize(word);
  if (core.length < MIN_LENGTH) return false;
  if (core === core.toUpperCase()) return false;
  // An inner capital (iPhone, eBook) marks a name the dictionary won't know.
  return !/\p{Lu}/u.test(core.slice(1));
}

/** Give a suggestion the capitalisation of the word it replaces. */
export function matchCase(original: string, suggestion: string): string {
  if (original === original.toUpperCase()) return suggestion.toUpperCase();
  const [first = ''] = original;
  if (first === first.toUpperCase()) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

export interface MisspelledRange {
  /** First ProseMirror position of the word. */
  from: number;
  /** Position just past the word. */
  to: number;
  word: string;
}

/**
 * Misspelled words inside one textblock, as ProseMirror position ranges.
 * The block's inline text is joined before checking, so a word split across
 * adjacent text nodes (e.g. half of it bold) is checked as a whole; `base` is
 * the block's first inline position (`blockPos + 1`). Pure, so it is easy to
 * test — pass `check` to fake the dictionary.
 */
export function misspelledRanges(
  block: PMNode,
  base: number,
  check: (word: string) => boolean = isCorrect,
): MisspelledRange[] {
  const parts: string[] = [];
  const positions: number[] = [];

  block.forEach((child, offset) => {
    // Code is never prose: treat it like a word break, not like text.
    const isCode =
      child.isText &&
      child.marks.some((mark) => mark.type.name === 'code');
    if (child.isText && child.text && !isCode) {
      const start = base + offset;
      parts.push(child.text);
      for (let i = 0; i < child.text.length; i++) positions.push(start + i);
    } else {
      // Hard breaks, images, inline code: a sentinel WORD_RE cannot match,
      // so it also stops two neighbours from fusing into one word.
      parts.push('\u0000');
      positions.push(base + offset);
    }
  });

  const text = parts.join('');
  const ranges: MisspelledRange[] = [];

  for (const match of text.matchAll(WORD_RE)) {
    const raw = match[0];
    if (!shouldCheck(raw) || check(raw)) continue;
    // Underline the word, not the apostrophes around it.
    const lead = raw.length - raw.replace(/^['’]+/, '').length;
    const trail = raw.length - raw.replace(/['’]+$/, '').length;
    const start = (match.index ?? 0) + lead;
    const end = (match.index ?? 0) + raw.length - trail;
    ranges.push({
      from: positions[start],
      to: positions[end - 1] + 1,
      word: text.slice(start, end),
    });
  }

  return ranges;
}

/**
 * Expand an edited inline range to whole words, using block-local offsets.
 * Leaf nodes occupy one position, just like the sentinel used by the checker.
 * Include both sides of an insertion/deletion so word splits and joins update.
 */
export function spellingWindow(block: PMNode, from: number, to: number) {
  const text = block.textBetween(0, block.content.size, '', '\u0000');
  // Keep UTF-16 surrogate pairs inside the same window as their neighbours.
  const wordChar = /[\p{L}'’\-\uD800-\uDFFF]/u;
  let start = Math.min(block.content.size, Math.max(0, from));
  let end = Math.max(start, Math.min(block.content.size, to));
  while (start > 0 && wordChar.test(text[start - 1])) start--;
  while (end < text.length && wordChar.test(text[end])) end++;
  return { from: start, to: end };
}

/** Every misspelled range in a whole document (code blocks are skipped). */
export function docMisspellings(doc: PMNode): MisspelledRange[] {
  const ranges: MisspelledRange[] = [];
  doc.descendants((node, pos) => {
    if (node.type.spec.code) return false;
    if (!node.isTextblock) return true;
    ranges.push(...misspelledRanges(node, pos + 1));
    return false;
  });
  return ranges;
}

/** Curly apostrophes normalized and edge apostrophes removed. */
function normalize(word: string): string {
  return word.replace(/[’‘]/g, "'").replace(/^'+|'+$/g, '');
}
