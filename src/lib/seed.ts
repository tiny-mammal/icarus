/**
 * Deterministic sample diary for development (`pnpm dev:seed`). Spans several
 * years back from today with gaps, multi-entry days, locations and Markdown,
 * so the calendar, reader, search and day navigation all have something real
 * to show. Only the storage layer reaches it, and only in seed mode, so
 * production builds leave it out.
 */
import { dateKey } from './date';
import type { DayRecord, DiaryEntry, HabitMark, Tracker } from './types';

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

interface SeedHabit {
  id: string;
  name: string;
  /** Chance of doing it the day after doing it. */
  sticky: number;
  /** Chance of doing it the day after not doing it. */
  resume: number;
  /** Days ago it started being tracked. */
  startedAgo?: number;
  /** Days it has been done in a row up to today, whatever the dice say. */
  streak?: number;
  archived?: boolean;
}

const SEED_HABITS: SeedHabit[] = [
  { id: 'seed-run', name: 'Morning run', sticky: 0.92, resume: 0.4, streak: 23 },
  { id: 'seed-read', name: 'Read 20 pages', sticky: 0.88, resume: 0.5, streak: 9 },
  { id: 'seed-sugar', name: 'No sugar', sticky: 0.7, resume: 0.35 },
  { id: 'seed-meditate', name: 'Meditate', sticky: 0.75, resume: 0.25, startedAgo: 140, streak: 4 },
  { id: 'seed-journal', name: 'Journal before bed', sticky: 0.8, resume: 0.3, archived: true },
];

/**
 * Habits and day scores for the same span as {@link seedEntries}: habits that
 * come in streaks and slip, one started late and one archived, and a score
 * for most days that drifts slowly and leans on how the habits went.
 */
export function seedTracker(years = 3, today = new Date(), seed = 1): Tracker {
  const rand = rng(seed + 7919);
  const total = Math.round(years * 365.25);
  const days = new Map<string, DayRecord>();
  const done = new Map<string, boolean>(); // the day before, per habit
  let mood = 6.5;

  for (let i = total; i >= 0; i--) {
    const key = dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    const marks: Record<string, HabitMark> = {};
    let doneToday = 0;
    for (const habit of SEED_HABITS) {
      // The archived habit only lived through the diary's first year.
      if (habit.archived ? i < total - 365 : i > (habit.startedAgo ?? total)) continue;
      if (rand() < 0.08) continue; // forgot to mark it either way
      const forced = habit.streak !== undefined && i < habit.streak;
      const did = forced || rand() < (done.get(habit.id) ? habit.sticky : habit.resume);
      done.set(habit.id, did);
      marks[habit.id] = did ? 'done' : 'missed';
      if (did) doneToday++;
    }

    mood = Math.min(8.6, Math.max(4.4, mood + (rand() - 0.5) * 0.5));
    const scored = i > 0 && rand() < 0.88;
    const value = Math.round(Math.min(10, Math.max(1, mood + doneToday * 0.35 - 0.7 + (rand() - 0.5) * 3)));
    if (scored || Object.keys(marks).length > 0) {
      days.set(key, { ...(scored ? { score: { value, scale: 10 } } : {}), marks, streaks: {} });
    }
  }

  return {
    habits: SEED_HABITS.map(({ id, name, archived }) => ({ id, name, archived: archived || undefined })),
    days,
    scoreScale: 10,
    unmarkedDays: 'pause',
    passStreak: true,
  };
}
