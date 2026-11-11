import { describe, expect, it } from 'vitest';
import { findLegacyMarks, markSegments, planLegacyScores } from '../src/lib/legacy-scores';
import { EMPTY_TRACKER, setScore } from '../src/lib/tracker';
import { keyToDate } from '../src/lib/date';
import type { DiaryEntry } from '../src/lib/types';

// Every text here is made up: the format, not anyone's diary.

const marks = (text: string) => findLegacyMarks(text).map(({ score, passed, clean }) => ({ score, passed, clean }));
/** The text a mark covers, to see exactly what would be highlighted. */
const covered = (text: string) => findLegacyMarks(text).map((m) => text.slice(m.start, m.end));

describe('findLegacyMarks — the formats', () => {
  it('reads the score before the run', () => {
    expect(marks('(6) 2DAC')).toEqual([{ score: 6, passed: true, clean: true }]);
    expect(marks('(3) 43DSC')).toEqual([{ score: 3, passed: false, clean: true }]);
    expect(marks('(10) 120DAC')).toEqual([{ score: 10, passed: true, clean: true }]);
  });

  it('reads the older format, with the score after the run', () => {
    expect(marks('20DAC. (6)')).toEqual([{ score: 6, passed: true, clean: true }]);
    expect(marks('7DSC (2)')).toEqual([{ score: 2, passed: false, clean: true }]);
  });

  it('finds the mark anywhere in the entry', () => {
    const text = 'Long day, felt slow.\n\nWent for a walk (it rained).\n\n(7) 12DAC\n\nBed early.';
    expect(marks(text)).toEqual([{ score: 7, passed: true, clean: true }]);
    expect(covered(text)).toEqual(['(7) 12DAC']);
  });

  it('covers the whole mark, score and run, in either format', () => {
    expect(covered('Notes. (6) 2DAC the end')).toEqual(['(6) 2DAC']);
    expect(covered('Notes. 20DAC. (6) the end')).toEqual(['20DAC. (6)']);
  });

  it('ignores case, spacing and Markdown around it', () => {
    expect(marks('(6) 2dac')[0]).toMatchObject({ score: 6, passed: true, clean: true });
    expect(marks('(6)   2 DAC')[0]).toMatchObject({ score: 6, clean: true });
    expect(marks('**(6) 2DAC**')[0]).toMatchObject({ score: 6, clean: true });
    expect(marks('\\(6\\) 2DAC')[0]).toMatchObject({ score: 6, clean: true });
    expect(marks('_(4) 9DSC_')[0]).toMatchObject({ score: 4, passed: false, clean: true });
    expect(marks('(6)\u00a02DAC')[0]).toMatchObject({ score: 6, clean: true }); // pasted from another app
  });

  it('finds several marks in one text', () => {
    expect(marks('(6) 2DAC\n(8) 3DAC')).toEqual([
      { score: 6, passed: true, clean: true },
      { score: 8, passed: true, clean: true },
    ]);
  });
});

describe('findLegacyMarks — typos', () => {
  it('flags a mark with a bracket missing, but still reads the score', () => {
    expect(marks('(6 2DAC')).toEqual([{ score: 6, passed: true, clean: false }]);
    expect(marks('6) 2DAC')).toEqual([{ score: 6, passed: true, clean: false }]);
    expect(marks('[6] 2DAC')).toEqual([{ score: 6, passed: true, clean: false }]);
  });

  it('flags a mark with the C missing, if a bracketed score is beside it', () => {
    expect(marks('(6) 2DA')).toEqual([{ score: 6, passed: true, clean: false }]);
    expect(marks('(6) 2DA casa')).toEqual([{ score: 6, passed: true, clean: false }]);
  });

  it('flags a mark without its run of days', () => {
    expect(marks('(6) DAC')).toEqual([{ score: 6, passed: true, clean: false }]);
  });

  it('reports a mark with no bracketed score, for someone to fill in', () => {
    expect(marks('6 2DAC')).toEqual([{ score: null, passed: true, clean: false }]);
    expect(marks('2DSC')).toEqual([{ score: null, passed: false, clean: false }]);
  });

  it('reads an out-of-range score as it is written', () => {
    expect(marks('(66) 2DAC')[0].score).toBe(66);
    expect(marks('(0) 2DSC')[0].score).toBe(0);
  });
});

describe('findLegacyMarks — what is not a mark', () => {
  it('ignores numbers and brackets in ordinary text', () => {
    expect(marks('Met 3 friends (2 of them new) in 2024.')).toEqual([]);
    expect(marks('Bought 2 dacha books (6)')).toEqual([]);
    expect(marks('We did 4 d a c things')).toEqual([]); // letters apart are not the token
  });

  it('ignores letters that only look like the token inside words', () => {
    expect(marks('(6) Dad actually came')).toEqual([]);
    expect(marks('(6) 2DACOTA')).toEqual([]);
    expect(marks('A2DAC (6)')).toEqual([]);
  });

  it('needs the days and letters together, not either alone', () => {
    expect(marks('(6)')).toEqual([]);
    expect(marks('2D')).toEqual([]);
  });
});

describe('markSegments', () => {
  it('cuts the text around the marks', () => {
    const text = 'Before (6) 2DAC after';
    expect(markSegments(text, findLegacyMarks(text))).toEqual([
      { text: 'Before ', marked: false },
      { text: '(6) 2DAC', marked: true },
      { text: ' after', marked: false },
    ]);
  });

  it('keeps all the text when there is nothing to mark', () => {
    expect(markSegments('plain', [])).toEqual([{ text: 'plain', marked: false }]);
  });
});

// --- planning --------------------------------------------------------------------

let seq = 0;
function entry(day: string, content: string, title = 'Entry'): DiaryEntry {
  return { uid: `e${seq++}@icarus.diary`, title, content, date: keyToDate(day) };
}

describe('planLegacyScores', () => {
  it('imports the days whose mark is certain', () => {
    const plan = planLegacyScores(
      [entry('2025-03-01', 'Good day.\n\n(6) 2DAC'), entry('2025-03-02', 'Bad day. 4DSC. (3)')],
      EMPTY_TRACKER,
    );
    expect([...plan.ready]).toEqual([
      ['2025-03-01', { value: 6, scale: 10 }],
      ['2025-03-02', { value: 3, scale: 10 }],
    ]);
    expect(plan.conflicts).toEqual([]);
  });

  it('counts the days with entries, marked or not', () => {
    const plan = planLegacyScores([entry('2025-03-01', '(6) 2DAC'), entry('2025-03-02', 'nothing')], EMPTY_TRACKER);
    expect(plan.days).toBe(2);
    expect(plan.ready.size).toBe(1);
  });

  it('reads the title as well as the body', () => {
    const plan = planLegacyScores([entry('2025-03-01', 'body', 'Friday (8) 5DAC')], EMPTY_TRACKER);
    expect(plan.ready.get('2025-03-01')).toEqual({ value: 8, scale: 10 });
  });

  it('accepts the same score twice in a day, in two entries', () => {
    const plan = planLegacyScores([entry('2025-03-01', '(6) 2DAC'), entry('2025-03-01', 'later (6) 2DAC')], EMPTY_TRACKER);
    expect(plan.ready.get('2025-03-01')).toEqual({ value: 6, scale: 10 });
    expect(plan.conflicts).toEqual([]);
  });

  it('settles by hand a day with two different scores', () => {
    const plan = planLegacyScores([entry('2025-03-01', '(6) 2DAC'), entry('2025-03-01', '(8) 3DAC')], EMPTY_TRACKER);
    expect(plan.ready.size).toBe(0);
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]).toMatchObject({ key: '2025-03-01', reasons: ['differs'], suggestion: null });
    expect(plan.conflicts[0].hits).toHaveLength(2);
  });

  it('settles by hand a letter that disagrees with the score, in both directions', () => {
    const plan = planLegacyScores([entry('2025-03-01', '(3) 2DAC'), entry('2025-03-02', '(6) 2DSC')], EMPTY_TRACKER);
    expect(plan.conflicts.map((c) => [c.key, c.reasons])).toEqual([
      ['2025-03-01', ['letter']],
      ['2025-03-02', ['letter']],
    ]);
    expect(plan.ready.size).toBe(0);
  });

  it('takes 5 as a pass and 4 as a fail', () => {
    const plan = planLegacyScores([entry('2025-03-01', '(5) 1DAC'), entry('2025-03-02', '(4) 1DSC')], EMPTY_TRACKER);
    expect(plan.ready.size).toBe(2);
    expect(plan.conflicts).toEqual([]);
  });

  it('settles by hand a mistyped mark, with its score as the suggestion', () => {
    const [conflict] = planLegacyScores([entry('2025-03-01', '(6 2DAC')], EMPTY_TRACKER).conflicts;
    expect(conflict).toMatchObject({ reasons: ['unsure'], suggestion: 6 });
  });

  it('settles by hand a mark without a score and one out of range', () => {
    const plan = planLegacyScores([entry('2025-03-01', '2DAC'), entry('2025-03-02', '(66) 2DAC')], EMPTY_TRACKER);
    expect(plan.conflicts.map((c) => [c.key, c.reasons, c.suggestion])).toEqual([
      ['2025-03-01', ['missing'], null],
      ['2025-03-02', ['range'], null],
    ]);
  });

  it('lists every reason a day has, in a steady order', () => {
    const plan = planLegacyScores([entry('2025-03-01', '(3) 2DAC\n(66 4DAC')], EMPTY_TRACKER);
    expect(plan.conflicts[0].reasons).toEqual(['range', 'letter']);
  });

  it('leaves alone a day the diary already scores the same', () => {
    const plan = planLegacyScores([entry('2025-03-01', '(6) 2DAC')], setScore(EMPTY_TRACKER, '2025-03-01', 6));
    expect(plan.unchanged).toBe(1);
    expect(plan.ready.size).toBe(0);
    expect(plan.conflicts).toEqual([]);
  });

  it('never overwrites a different score without asking', () => {
    const [conflict] = planLegacyScores([entry('2025-03-01', '(6) 2DAC')], setScore(EMPTY_TRACKER, '2025-03-01', 8)).conflicts;
    expect(conflict).toMatchObject({ reasons: ['existing'], suggestion: 6, existing: { value: 8, scale: 10 } });
  });

  it('compares with a score given on another scale by its height', () => {
    // 5 of 5 is the top, a 10 of 10.
    const fiveScale = { ...EMPTY_TRACKER, scoreScale: 5 };
    const plan = planLegacyScores([entry('2025-03-01', '(10) 2DAC')], setScore(fiveScale, '2025-03-01', 5));
    expect(plan.unchanged).toBe(1);
  });

  it('orders conflicts from the oldest day', () => {
    const plan = planLegacyScores([entry('2025-05-01', '2DAC'), entry('2025-03-01', '2DAC')], EMPTY_TRACKER);
    expect(plan.conflicts.map((c) => c.key)).toEqual(['2025-03-01', '2025-05-01']);
  });
});
