/**
 * The sample diary used by `scripts/landing-screenshots.ts`. Unlike the dev seed
 * (`src/lib/seed.ts`), it reads like one person's real diary: hand-written
 * entries around the month the screenshots show, and years of quieter history
 * behind them so search and statistics have something to find.
 */

interface SampleEntry {
  date: string; // YYYY-MM-DD
  title: string;
  location?: string;
  content: string;
}

/** The day the screenshots pretend is today. */
export const TODAY = '2026-10-24';

const FEATURED: SampleEntry[] = [
  {
    date: '2026-10-01',
    title: 'First cold morning',
    location: 'Home',
    content: 'Put the heavy blanket back on the bed. The radiator clicked on for the first time since April.',
  },
  {
    date: '2026-10-02',
    title: 'Ferry to the island',
    location: 'Lisbon',
    content:
      'Took the 9:40 across the river with Ana. The water was flat and silver.\n\nWe ate grilled sardines at the place with the blue door and missed the ferry back on purpose.',
  },
  {
    date: '2026-10-04',
    title: 'Repotting the fig',
    content: 'Its roots had wrapped the whole pot twice. Gave it a bigger home and an apology.',
  },
  {
    date: '2026-10-05',
    title: 'Grandma’s recipe, attempt three',
    location: 'Home',
    content:
      '## What changed\n\n- Less flour, more patience\n- Let the dough rest overnight\n- Oven at 180, not 200\n\nCloser. Still not hers, but closer.',
  },
  {
    date: '2026-10-07',
    title: 'Long run by the river',
    content: 'Twelve kilometres. Knees fine. Head clearer than it has been all month.',
  },
  {
    date: '2026-10-08',
    title: 'Letter from Tomás',
    content: 'A real letter, with a stamp. He is moving to Porto in spring and wants us to visit.',
  },
  {
    date: '2026-10-08',
    title: 'Late shift',
    location: 'The office',
    content: 'Shipped the release at 11pm. Walked home under the streetlights, too awake to sleep.',
  },
  {
    date: '2026-10-10',
    title: 'Market in the rain',
    location: 'Madrid',
    content: 'Quinces, chestnuts, a bunch of dahlias that cost too much. Worth it.',
  },
  {
    date: '2026-10-11',
    title: 'Quiet Sunday',
    content: 'Read on the balcony until the light went. Did nothing useful and felt great about it.',
  },
  {
    date: '2026-10-13',
    title: 'Dentist, then cake',
    content: 'A reward system that works every time.',
  },
  {
    date: '2026-10-15',
    title: 'Concert at the old theatre',
    location: 'Madrid',
    content: 'The cellist played an encore nobody expected. The whole hall held its breath.',
  },
  {
    date: '2026-10-16',
    title: 'Mum’s birthday',
    location: 'Valencia',
    content: 'Paella on the terrace, eleven of us around one table. She cried at the photo album.',
  },
  {
    date: '2026-10-17',
    title: 'Train home',
    content: 'Three hours of olive groves and a book I could not put down.',
  },
  {
    date: '2026-10-19',
    title: 'Started pottery class',
    content: 'My first bowl is a plate. The teacher says that is how everyone starts.',
  },
  {
    date: '2026-10-20',
    title: 'Fog over the city',
    content: 'Could not see the towers from the window. The whole street sounded softer.',
  },
  {
    date: '2026-10-21',
    title: 'Coffee with Ana',
    location: 'Lisbon',
    content: 'She got the job. We celebrated with two pastéis each and no regrets.',
  },
  {
    date: '2026-10-22',
    title: 'Night swim',
    content: 'The pool was empty and the water warmer than the air. Floated on my back and counted lights.',
  },
  {
    date: '2026-10-23',
    title: 'Fixing the bike',
    content: 'New chain, new brakes, oil on everything including me.',
  },
  {
    date: '2026-10-24',
    title: 'Walking the old town',
    location: 'Lisbon',
    content: [
      'Woke before the alarm and took the long way down to the river. The trams were still asleep and the light came in sideways, gold on the yellow walls.',
      '',
      'Things I want to remember about today:',
      '',
      '- The baker who gave me the burnt one for free',
      '- Ana laughing so hard she had to sit on the steps',
      '- How quiet the miradouro was at eight',
      '',
      '> Some days you live, and some days you keep.',
      '',
      'This was a keeper.',
    ].join('\n'),
  },
  {
    date: '2026-10-24',
    title: 'Note to self',
    content: 'Book the train to Porto before the prices go up.',
  },
  {
    date: '2026-09-28',
    title: 'Last swim of summer',
    content: 'The sea was colder than I admitted out loud.',
  },
  {
    date: '2026-09-30',
    title: 'Moving the desk',
    content: 'Now it faces the window. Already writing more.',
  },
  {
    date: '2026-11-01',
    title: 'Chestnuts on the corner',
    content: 'The first roaster of the season is back by the metro.',
  },
];

/** Titles for the background years; a few repeat on purpose so search finds patterns. */
const TITLES = [
  'Morning walk', 'Rainy afternoon', 'Long day at work', 'Trip to the coast',
  'Reading in the park', 'Late dinner', 'First snow', 'Moving boxes',
  'Market run', 'Night swim', 'Coffee with Ana', 'Sunday at home',
  'Train to Valencia', 'Birthday dinner', 'Cinema alone', 'Garden day',
  'Thunderstorm', 'Learning the guitar', 'A good letter',
  'Hiking the sierra', 'Beach at dusk', 'Cooking for friends', 'Museum afternoon',
];
const LOCATIONS = ['Madrid', 'Lisbon', 'Home', 'Valencia', 'Porto', 'The office'];
const SENTENCES = [
  'Woke up early and watched the light come in.',
  'The city felt slower than usual, which I liked.',
  'Finally finished the book I had been putting off for months.',
  'Called home; everyone is doing fine.',
  'Walked for an hour without any destination.',
  'Too tired to write much, but it was a good day.',
  'Cooked something new and it almost worked.',
  'Ana sent a song that I played on repeat all evening.',
  'Dinner at Ana’s place; she burned the rice and we laughed about it for an hour.',
  'Ana and I walked the whole length of the beach without saying much.',
  'The sea was rough and beautiful.',
  'Wrote three pages and threw away two.',
];

/** Seeded PRNG (mulberry32) so every run produces the same diary. */
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

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Background entries from `fromYear` up to the featured month. */
function history(fromYear: number): SampleEntry[] {
  const rand = rng(7);
  const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const entries: SampleEntry[] = [];
  const start = Date.UTC(fromYear, 0, 1);
  const end = Date.UTC(2026, 8, 27); // the featured weeks take over from here
  for (let t = start; t <= end; t += 86_400_000) {
    const date = new Date(t);
    // Writing habits change: busy years, quiet summers, a long-entry winter.
    const year = date.getUTCFullYear() - fromYear;
    const season = Math.sin(((date.getUTCMonth() + 1) / 12) * Math.PI * 2);
    const keep = 0.35 + 0.08 * Math.sin(year * 1.3) + 0.12 * season;
    if (rand() > keep) continue;
    const length = 1 + Math.floor(rand() * (3 + (year % 3) * 2));
    const sentences = Array.from({ length }, () => pick(SENTENCES));
    entries.push({
      date: isoDate(date),
      title: pick(TITLES),
      location: rand() < 0.3 ? pick(LOCATIONS) : undefined,
      content: sentences.join(' '),
    });
  }
  return entries;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** The year the sample diary starts. */
const FIRST_YEAR = 2019;

/** Every sample entry, oldest first. */
function sampleEntries(): SampleEntry[] {
  return [...history(FIRST_YEAR), ...FEATURED].sort((a, b) => a.date.localeCompare(b.date));
}

/** One entry as the VEVENT lines it is stored as. */
function veventLines(entry: SampleEntry, uid: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@icarus.diary`,
    `DTSTART;VALUE=DATE:${entry.date.replace(/-/g, '')}`,
    `SUMMARY:${escapeText(entry.title)}`,
    ...(entry.location ? [`LOCATION:${escapeText(entry.location)}`] : []),
    `DESCRIPTION:${escapeText(entry.content)}`,
    'END:VEVENT',
  ];
}

/** The whole sample diary as an `.ics` file. */
export function sampleDiaryIcs(): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//icarus//landing sample//EN'];
  sampleEntries().forEach((entry, i) => lines.push(...veventLines(entry, `landing-${i}`)));
  lines.push('END:VCALENDAR', '');
  return lines.join('\r\n');
}
