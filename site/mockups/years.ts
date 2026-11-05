/**
 * Years: a field with one dot per day of the sample diary, lit in the order
 * the days were written. Point at a dot (or move with the arrow keys) to
 * read that day; the .ics block further down shows the same entry as saved.
 * Below it, a filmstrip of the app that scrolls sideways on wide screens.
 */
import { FIRST_YEAR, TODAY, sampleEntries, veventLines, type SampleEntry } from '../sample-diary';
import { longDate, onScrollProgress, reducedMotion } from './shared';

const DAY = 86_400_000;
const COLUMNS = 54; // enough week columns for any year, whatever day it starts on

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);

const entries = sampleEntries();
const byDay = new Map<string, SampleEntry[]>();
for (const entry of entries) {
  if (entry.date > TODAY) continue;
  byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry]);
}

const start = Date.UTC(FIRST_YEAR, 0, 1);
const end = utc(TODAY);
const lastYear = new Date(end).getUTCFullYear();

/** Column and row of a day inside its year's block (weeks start on Monday). */
function cellOf(t: number): { year: number; col: number; row: number } {
  const d = new Date(t);
  const year = d.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const offset = (new Date(jan1).getUTCDay() + 6) % 7;
  const dayOfYear = Math.round((t - jan1) / DAY);
  return { year, col: Math.floor((dayOfYear + offset) / 7), row: (dayOfYear + offset) % 7 };
}

function dayAt(year: number, col: number, row: number): number | null {
  const jan1 = Date.UTC(year, 0, 1);
  const offset = (new Date(jan1).getUTCDay() + 6) % 7;
  const t = jan1 + (col * 7 + row - offset) * DAY;
  if (new Date(t).getUTCFullYear() !== year || t < start || t > end) return null;
  return t;
}

// --- Field ---------------------------------------------------------------
const field = document.querySelector<HTMLElement>('[data-field]');
const canvases = new Map<number, HTMLCanvasElement>();
if (field) {
  for (let year = FIRST_YEAR; year <= lastYear; year++) {
    const block = document.createElement('div');
    block.className = 'yr-year';
    const label = document.createElement('span');
    label.textContent = String(year);
    const canvas = document.createElement('canvas');
    canvas.dataset.year = String(year);
    canvas.setAttribute('aria-hidden', 'true');
    block.append(label, canvas);
    field.append(block);
    canvases.set(year, canvas);
  }
}

const css = getComputedStyle(document.documentElement);
const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
const EMPTY = color('--color-slate', '#27272a');
const TEXT = color('--color-text', '#fafafa');

/** Brightness of a written day: longer days glow brighter. */
function shade(list: SampleEntry[]): string {
  const chars = list.reduce((sum, e) => sum + e.content.length, 0);
  const t = Math.min(1, chars / 320);
  const g = Math.round(96 + t * 150);
  return `rgb(${g} ${g} ${g + 3})`;
}

let selected = Number.NaN; // set to today once everything is wired
const revealStart = performance.now() + 200;
const REVEAL_MS = reducedMotion() ? 0 : 1600;

/** Draw one year. `now` drives the first reveal sweep. */
function drawYear(year: number, now: number): boolean {
  const canvas = canvases.get(year)!;
  const width = canvas.clientWidth;
  if (!width) return false;
  const cell = width / COLUMNS;
  const height = cell * 7;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(width * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  let animating = false;
  const dot = (x: number, y: number, r: number, fill: string, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  for (let col = 0; col < COLUMNS; col++) {
    for (let row = 0; row < 7; row++) {
      const t = dayAt(year, col, row);
      if (t === null) continue;
      const x = (col + 0.5) * cell;
      const y = (row + 0.5) * cell;
      const list = byDay.get(iso(t));
      dot(x, y, cell * 0.14, EMPTY);
      if (list) {
        // Each written day lights up at its moment in the sweep.
        const at = revealStart + ((t - start) / (end - start)) * REVEAL_MS;
        const k = REVEAL_MS ? Math.min(1, Math.max(0, (now - at) / 280)) : 1;
        if (k < 1) animating = true;
        if (k > 0) dot(x, y, cell * (0.2 + 0.1 * k + (k < 1 ? 0.12 * Math.sin(k * Math.PI) : 0)), shade(list), k);
      }
      if (t === end) {
        dot(x, y, cell * 0.42, TEXT);
      }
      if (t === selected && t !== end) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = TEXT;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.44, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  return animating;
}

function drawAll(now = performance.now()): boolean {
  let animating = false;
  for (const year of canvases.keys()) animating = drawYear(year, now) || animating;
  return animating;
}

if (field) {
  const loop = (now: number) => {
    if (drawAll(now)) requestAnimationFrame(loop);
  };
  document.fonts.ready.then(() => requestAnimationFrame(loop));
  new ResizeObserver(() => {
    drawAll();
    placeCard();
  }).observe(field);
}

// --- Reading card and the saved file -------------------------------------
const card = document.querySelector<HTMLElement>('[data-card]');
const ics = document.querySelector<HTMLElement>('[data-ics] code');

/** The few Markdown shapes the sample diary uses, built as DOM. */
function renderBody(content: string): Node[] {
  return content.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => l.startsWith('- '))) {
      const ul = document.createElement('ul');
      for (const line of lines) {
        const li = document.createElement('li');
        li.textContent = line.slice(2);
        ul.append(li);
      }
      return ul;
    }
    const tag = block.startsWith('> ') ? 'blockquote' : block.startsWith('## ') ? 'h4' : 'p';
    const el = document.createElement(tag);
    el.textContent = tag === 'p' ? block : block.replace(/^(> |## )/, '');
    return el;
  });
}

function showIcs(entry: SampleEntry): void {
  if (!ics) return;
  const uid = `landing-${entries.indexOf(entry)}`;
  ics.replaceChildren(
    ...veventLines(entry, uid).flatMap((line, i) => {
      const split = line.search(/[:;]/);
      const key = document.createElement('span');
      key.className = 'yr-ics-key';
      key.textContent = line.slice(0, split);
      return [...(i ? ['\n'] : []), key, line.slice(split)];
    }),
  );
}

function select(t: number): void {
  t = Math.min(end, Math.max(start, t));
  if (t === selected) return;
  selected = t;
  drawAll();
  if (!card) return;
  const list = byDay.get(iso(t)) ?? [];
  const [first] = list;
  card.toggleAttribute('data-empty', !first);
  card.querySelector('[data-card-date]')!.textContent = longDate(iso(t));
  card.querySelector('[data-card-title]')!.textContent = first ? first.title : 'Nothing written this day';
  card.querySelector('[data-card-place]')!.textContent = first?.location ?? '';
  const body = card.querySelector('[data-card-body]')!;
  body.replaceChildren(...(first ? renderBody(first.content) : []));
  if (list.length > 1) {
    const more = document.createElement('p');
    more.className = 'yr-card-place';
    more.textContent = list.length === 2 ? 'One more entry that day.' : `${list.length - 1} more entries that day.`;
    body.append(more);
  }
  if (first) showIcs(first);
  placeCard();
}

/** Float the card beside the chosen dot, kept inside the field. */
function placeCard(): void {
  const explorer = card?.parentElement;
  const canvas = canvases.get(new Date(selected).getUTCFullYear());
  if (!card || !explorer || !canvas || getComputedStyle(card).position !== 'absolute') return;
  const box = explorer.getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const cell = rect.width / COLUMNS;
  const { col, row } = cellOf(selected);
  const x = rect.left - box.left + (col + 0.5) * cell;
  const y = rect.top - box.top + (row + 0.5) * cell;
  const gap = 18;
  const right = x + gap + card.offsetWidth <= box.width;
  const left = right ? x + gap : x - gap - card.offsetWidth;
  const top = Math.min(Math.max(0, y - 40), box.height - card.offsetHeight);
  card.style.setProperty('--card-x', `${Math.round(left)}px`);
  card.style.setProperty('--card-y', `${Math.round(top)}px`);
}

if (field) {
  const pick = (event: PointerEvent) => {
    const canvas = (event.target as Element).closest('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cell = rect.width / COLUMNS;
    const t = dayAt(
      Number(canvas.dataset.year),
      Math.floor((event.clientX - rect.left) / cell),
      Math.floor((event.clientY - rect.top) / cell),
    );
    if (t !== null) select(t);
  };
  field.addEventListener('pointermove', pick);
  field.addEventListener('pointerdown', pick);
  // Rows are weekdays and columns are weeks, so up and down move a day.
  const steps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Home') select(start);
    else if (event.key === 'End') select(end);
    else if (event.key in steps) select(selected + steps[event.key] * DAY);
    else return;
    event.preventDefault();
  });
}

select(end);

// --- Filmstrip -------------------------------------------------------------
const strip = document.querySelector<HTMLElement>('[data-strip]');
const track = document.querySelector<HTMLElement>('[data-track]');
const sideways = window.matchMedia('(min-width: 64rem) and (prefers-reduced-motion: no-preference)');
if (strip && track) {
  // Progress through the pinned stretch only: from the strip's top reaching
  // the viewport top to its bottom reaching the viewport bottom.
  onScrollProgress(strip, () => {
    if (!sideways.matches) return track.style.removeProperty('--shift');
    const rect = strip.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
    const distance = track.scrollWidth - window.innerWidth;
    track.style.setProperty('--shift', String(Math.max(0, distance) * p));
  });
}
