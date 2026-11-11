/**
 * Deterministic sample diary for development (`pnpm dev:seed`). Spans several
 * years back from today with gaps, multi-entry days, locations and Markdown,
 * so the calendar, reader, search and day navigation all have something real
 * to show. Only the storage layer reaches it, and only in seed mode, so
 * production builds leave it out.
 */
import type { DiaryEntry } from './types';

/** Names the spell checker would flag, already in the sample personal dictionary. */
export const SEED_SPELL_WORDS = ['Ana', 'Baiona', 'Cíes', 'Marisol', 'Sanxenxo', 'Vigo', 'Xoán'];

const TITLES = [
  'Morning walk', 'Quiet Sunday', 'Coffee with Ana', 'Rainy afternoon',
  'Long day at work', 'Trip to the coast', 'Reading in the park', 'Late dinner',
  'First snow', 'Moving boxes', 'Market run', 'Night swim', 'Untitled',
];
const LOCATIONS = ['Madrid', 'Lisbon', 'Home', 'The office', 'Valencia', 'Porto'];
const SENTENCES = [
  'Woke up early and watched the light come in.',
  'Today I petted a tiny mammal.',
  'The city felt slower than usual, which I liked.',
  'Finally finished the book I had been putting off for months.',
  'Called home; everyone is doing fine.',
  'Walked for an hour without any destination.',
  'Too tired to write much, but it was a good day.',
  'Cooked something new and it almost worked.',
];

/** Small seeded PRNG (mulberry32) so every run produces the same diary. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function body(rand: () => number, pick: <T>(xs: T[]) => T): string {
  const lines = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => pick(SENTENCES));
  if (rand() < 0.25) lines.push('', '- one small thing\n- another small thing');
  if (rand() < 0.15) lines.unshift('## Notes', '');
  return lines.join('\n\n');
}

/**
 * Entries for roughly `years` years ending at `today`: about half of the days
 * have an entry, and some of those hold two or three.
 */
export function seedEntries(years = 3, today = new Date(), seed = 1): DiaryEntry[] {
  const rand = rng(seed);
  const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const entries: DiaryEntry[] = [];
  const days = Math.round(years * 365.25);
  for (let i = days; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    if (i > 0 && rand() < 0.5) continue; // leave gaps, but always write today
    const perDay = rand() < 0.15 ? 2 + Math.floor(rand() * 2) : 1;
    for (let n = 0; n < perDay; n++) {
      entries.push({
        uid: `seed-${entries.length}@icarus.diary`,
        title: pick(TITLES),
        content: body(rand, pick),
        location: rand() < 0.3 ? pick(LOCATIONS) : undefined,
        date,
      });
    }
  }
  return entries;
}
