/**
 * The sun's colour for a day's score: a dim dusk for the worst score, rising
 * through dawn to a bright noon for the best. Computed here rather than with
 * CSS `color-mix()` over custom properties, which older Android WebViews
 * (Chromium < 111) can't render and the build can't lower.
 */
import { scoreLevel } from './tracker';
import type { DayScore } from './types';

type Rgb = readonly [number, number, number];

/** Dusk, dawn, the sun (`--color-sun`) and noon. */
const STOPS: readonly Rgb[] = [
  [0x7d, 0x5a, 0x55],
  [0xd9, 0x73, 0x4a],
  [0xf5, 0xb4, 0x52],
  [0xff, 0xe1, 0x9a],
];

/** The best score its scale allows: the day the sun shows every colour. */
export function isBestScore(score: DayScore): boolean {
  return score.value >= score.scale;
}

/** The sun's colour for `score`, as CSS `rgb()`/`rgba()` with `alpha`. */
export function sunColor(score: DayScore, alpha = 1): string {
  const position = scoreLevel(score.value, score.scale) * (STOPS.length - 1);
  const from = Math.min(STOPS.length - 2, Math.floor(position));
  const t = position - from;
  const [r, g, b] = STOPS[from].map((c, i) => Math.round(c + (STOPS[from + 1][i] - c) * t));
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
