import { describe, it, expect, vi } from 'vitest';
import ICAL from 'ical.js';
import { isInvalidDate, parseIcs, serializeIcs } from '../src/lib/ical';
import type { DiaryEntry } from '../src/lib/types';
import { dateKey } from '../src/lib/date';

const sample: DiaryEntry[] = [
  {
    uid: 'a@icarus.diary',
    title: 'Morning pages',
    content: '# Heading\n\nSome *italic* and `code`.\n\n- one\n- two',
    location: 'Kitchen table',
    date: new Date(2026, 5, 8), // 8 June 2026
  },
  {
    uid: 'b@icarus.diary',
    title: 'Evening reflection',
    content: 'A second entry on the **same** day.',
    date: new Date(2026, 5, 8), // same day — the edge case
  },
  {
    uid: 'c@icarus.diary',
    title: 'Next day',
    content: 'Plain text.',
    location: 'Park',
    date: new Date(2026, 5, 9),
  },
];

describe('ical roundtrip', () => {
  it('preserves all fields through serialize → parse', () => {
    const ics = serializeIcs(sample);
    const res = parseIcs(ics);

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.entries).toHaveLength(3);

    for (const original of sample) {
      const found = res.entries.find((e) => e.uid === original.uid);
      expect(found, `entry ${original.uid} survived`).toBeDefined();
      if (!found) continue;
      expect(found.title).toBe(original.title);
      expect(found.content).toBe(original.content);
      expect(found.location).toBe(original.location);
      // Compare by day key — date-only semantics, no timezone drift.
      expect(dateKey(found.date)).toBe(dateKey(original.date));
    }
  });

  it('handles multiple entries on the same date', () => {
    const ics = serializeIcs(sample);
    const res = parseIcs(ics);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const onJune8 = res.entries.filter(
      (e) => dateKey(e.date) === '2026-06-08',
    );
    expect(onJune8).toHaveLength(2);
  });

  it('produces a valid VCALENDAR wrapper', () => {
    const ics = serializeIcs(sample);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });

  it('treats an empty file as zero entries (not an error)', () => {
    const res = parseIcs('   \n  ');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.entries).toHaveLength(0);
  });

  it('returns a typed error for corrupt input instead of throwing', () => {
    const res = parseIcs('this is not iCalendar at all {{{');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(typeof res.error).toBe('string');
  });
});

describe('unparseable DTSTART', () => {
  it('keeps the entry but flags it with the sentinel year instead of rewriting to today', () => {
    // No DTSTART line at all: ical.js returns null and the parser must not
    // quietly default to `new Date()` (which would re-date the entry).
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//test//EN',
      'BEGIN:VEVENT',
      'UID:orphan@icarus.diary',
      'DTSTAMP:20260628T000000Z',
      'SUMMARY:Mystery entry',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const res = parseIcs(ics);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.entries).toHaveLength(1);
    const entry = res.entries[0];
    expect(entry.title).toBe('Mystery entry');
    expect(isInvalidDate(entry.date)).toBe(true);
    // Crucially: the date is NOT "today". It is the sentinel year 1.
    expect(entry.date.getFullYear()).not.toBe(new Date().getFullYear());
  });

  it('round-trips an entry flagged with the sentinel date without silently fixing it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//test//EN',
      'BEGIN:VEVENT',
      'UID:orphan2@icarus.diary',
      'DTSTAMP:20260628T000000Z',
      'SUMMARY:Still lost',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const res = parseIcs(ics);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const written = serializeIcs(res.entries);
    const reparsed = parseIcs(written);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect(reparsed.entries[0].title).toBe('Still lost');
    // The date is still flagged after a round-trip — we never silently healed it.
    expect(isInvalidDate(reparsed.entries[0].date)).toBe(true);
    warn.mockRestore();
  });
});

/** What ical.js itself writes for `entries`: the reference `serializeIcs` matches. */
function icalJsReference(entries: DiaryEntry[]): string {
  const vcal = new ICAL.Component(['vcalendar', [], []]);
  vcal.updatePropertyWithValue('version', '2.0');
  vcal.updatePropertyWithValue('prodid', '-//Icarus Diary//Local-First Diary//EN');
  vcal.updatePropertyWithValue('calscale', 'GREGORIAN');
  for (const e of entries) {
    const ve = new ICAL.Component('vevent');
    ve.updatePropertyWithValue('uid', e.uid);
    ve.updatePropertyWithValue('dtstamp', ICAL.Time.now());
    ve.updatePropertyWithValue(
      'dtstart',
      ICAL.Time.fromData({
        year: e.date.getFullYear(),
        month: e.date.getMonth() + 1,
        day: e.date.getDate(),
        isDate: true,
      }),
    );
    ve.updatePropertyWithValue('summary', e.title);
    if (e.content) ve.updatePropertyWithValue('description', e.content);
    if (e.location) ve.updatePropertyWithValue('location', e.location);
    vcal.addSubcomponent(ve);
  }
  return vcal.toString();
}

describe('serializeIcs matches ical.js', () => {
  // Folding counts UTF-8 bytes, so mix widths, surrogate pairs and escapes
  // around the 75-byte boundary.
  const pieces = ['a', 'ñ', '€', '😀', '\\', ';', ',', '\n', ' ', 'word ', '日本語', '\r'];
  function text(seed: number, length: number): string {
    let out = '';
    let x = seed;
    for (let i = 0; i < length; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      out += pieces[x % pieces.length];
    }
    return out;
  }
  const entries: DiaryEntry[] = Array.from({ length: 200 }, (_, i) => ({
    uid: i % 7 === 0 ? `odd;uid,${i}@x` : `${i}@icarus.diary`,
    title: text(i, i % 40),
    content: i % 5 === 0 ? '' : text(i + 1000, (i * 13) % 400),
    location: i % 3 === 0 ? text(i + 2000, i % 90) : undefined,
    date: new Date(i === 0 ? 9999 : 1990 + (i % 40), i % 12, 1 + (i % 28)),
  }));

  it('writes the same bytes', () => {
    const noStamp = (ics: string) => ics.replace(/^DTSTAMP:.*$/gm, '');
    expect(noStamp(serializeIcs(entries))).toBe(noStamp(icalJsReference(entries)));
  });

  it('writes the same DTSTAMP', () => {
    const stamp = (ics: string) => ics.match(/^DTSTAMP:.*$/m)?.[0];
    // Retry across a second boundary rather than flake on it.
    for (let attempt = 0; attempt < 3; attempt++) {
      const ours = stamp(serializeIcs(sample));
      if (ours === stamp(icalJsReference(sample))) return;
    }
    expect.unreachable('DTSTAMP differs from ical.js');
  });

  it('round-trips every character', () => {
    const res = parseIcs(serializeIcs(entries));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Parsing trims fields and drops empty locations, as it always has.
    expect(res.entries.map((e) => [e.uid, e.title, e.content, e.location, dateKey(e.date)])).toEqual(
      entries.map((e) => [
        e.uid,
        e.title.trim() || 'Untitled',
        e.content.trim(),
        e.location?.trim() || undefined,
        dateKey(e.date),
      ]),
    );
  });
});

describe('parseIcs', () => {
  const wrap = (...lines: string[]) =>
    ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//test//EN', ...lines, 'END:VCALENDAR'].join('\r\n');

  it('takes the calendar day of a date-time DTSTART, whatever its zone', () => {
    const res = parseIcs(
      wrap(
        'BEGIN:VEVENT', 'UID:a', 'DTSTART:20240310T233000Z', 'SUMMARY:Late', 'END:VEVENT',
        'BEGIN:VEVENT', 'UID:b', 'DTSTART;TZID=Europe/Madrid:20240311T000500', 'SUMMARY:Early', 'END:VEVENT',
      ),
    );
    expect(res.ok && res.entries.map((e) => dateKey(e.date))).toEqual(['2024-03-10', '2024-03-11']);
  });

  it('reads the events of every calendar in a concatenated file', () => {
    const one = wrap('BEGIN:VEVENT', 'UID:a', 'DTSTART;VALUE=DATE:20240101', 'SUMMARY:One', 'END:VEVENT');
    const two = wrap('BEGIN:VEVENT', 'UID:b', 'DTSTART;VALUE=DATE:20240102', 'SUMMARY:Two', 'END:VEVENT');
    const res = parseIcs(`${one}\r\n${two}`);
    expect(res.ok && res.entries.map((e) => e.title)).toEqual(['One', 'Two']);
  });

  it('ignores other components, nested ones included', () => {
    const res = parseIcs(
      wrap(
        'BEGIN:VTODO', 'UID:t', 'SUMMARY:Chore', 'END:VTODO',
        'BEGIN:VEVENT', 'UID:a', 'DTSTART;VALUE=DATE:20240101', 'SUMMARY:Kept',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Ring', 'TRIGGER:-PT5M', 'END:VALARM',
        'END:VEVENT',
      ),
    );
    expect(res.ok && res.entries.map((e) => [e.title, e.content])).toEqual([['Kept', '']]);
  });
});
