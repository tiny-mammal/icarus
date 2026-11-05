/**
 * Geometry helpers for the statistics chart. Plain functions with no DOM or
 * Svelte dependency, so the curve maths can be unit-tested on its own.
 */

export interface ChartPoint {
  x: number;
  y: number;
}

/** Round to two decimals — enough precision, shorter path strings. */
function r(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * A monotone cubic (Fritsch–Carlson) path through `points`, sorted by x. The
 * curve never overshoots the data, which a plain Catmull-Rom would — dipping
 * below zero between two small values would be nonsense for a count of
 * characters written.
 */
export function monotoneLinePath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  if (points.length === 1) return `M ${r(first.x)} ${r(first.y)}`;

  const n = points.length;
  const spans: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1].x - points[i].x;
    spans.push(h);
    slopes.push(h === 0 ? 0 : (points[i + 1].y - points[i].y) / h);
  }

  // Initial tangents: the average of neighbouring slopes (one-sided at ends).
  const tangents = new Array<number>(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
  }

  // Flatten turning points and stop tangents pointing against their segment —
  // both would otherwise let the curve overshoot or wiggle.
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    }
  }
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) continue;
    if (tangents[i] / slopes[i] < 0) tangents[i] = 0;
    if (tangents[i + 1] / slopes[i] < 0) tangents[i + 1] = 0;
  }

  // Finally clamp the rest so no curve segment overshoots (Fritsch–Carlson).
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) continue;
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const sum = a * a + b * b;
    if (sum > 9) {
      const scale = 3 / Math.sqrt(sum);
      tangents[i] = scale * a * slopes[i];
      tangents[i + 1] = scale * b * slopes[i];
    }
  }

  let d = `M ${r(first.x)} ${r(first.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = spans[i];
    const c1x = points[i].x + h / 3;
    const c1y = points[i].y + (tangents[i] * h) / 3;
    const c2x = points[i + 1].x - h / 3;
    const c2y = points[i + 1].y - (tangents[i + 1] * h) / 3;
    d += ` C ${r(c1x)} ${r(c1y)}, ${r(c2x)} ${r(c2y)}, ${r(points[i + 1].x)} ${r(points[i + 1].y)}`;
  }
  return d;
}

/** A vertical bar from `top` down to the baseline, `width` wide from `x`. */
export interface ChartBar {
  x: number;
  width: number;
  top: number;
}

/**
 * Every bar as rectangles in one SVG path: a year of daily bars stays a single
 * DOM node instead of hundreds. Bars with no height are skipped.
 */
export function barsPath(bars: readonly ChartBar[], baselineY: number): string {
  let d = '';
  for (const bar of bars) {
    if (bar.top >= baselineY || bar.width <= 0) continue;
    d += `M${r(bar.x)} ${r(baselineY)}V${r(bar.top)}h${r(bar.width)}V${r(baselineY)}Z`;
  }
  return d;
}

/** Round `value` up to a "nice" axis maximum (1/1.5/2/2.5/3/4/5/10 × 10ⁿ). */
export function niceCeil(value: number): number {
  if (!(value > 0)) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 10]) {
    const candidate = step * magnitude;
    if (value <= candidate) return candidate;
  }
  return 10 * magnitude;
}

const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Compact axis label, e.g. 1_234 → "1.2K"; plain below a thousand. */
export function compactNumber(value: number): string {
  return value < 1000 ? String(value) : compact.format(value);
}

export interface TooltipBox {
  left: number;
  top: number;
}

/**
 * Place a tooltip of `size` next to the hovered `point` without hiding the
 * point or the line under it. It sits centred above the point whenever there
 * is room (it may rise up to `bounds.top`, which can be negative to borrow the
 * space above the chart); for a peak too close to the top it moves beside the
 * point instead, towards the wider half of the chart. Horizontally it is always
 * kept within `bounds.width`.
 */
export function placeTooltip(
  point: ChartPoint,
  size: { width: number; height: number },
  bounds: { top: number; width: number; height: number },
  gap = 10,
): TooltipBox {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), Math.max(min, max));
  const maxLeft = bounds.width - size.width;

  const aboveTop = point.y - gap - size.height;
  if (aboveTop >= bounds.top) {
    return { left: clamp(point.x - size.width / 2, 0, maxLeft), top: aboveTop };
  }

  const fitsRight = point.x + gap + size.width <= bounds.width;
  const fitsLeft = point.x - gap - size.width >= 0;
  const right = fitsRight && (point.x < bounds.width / 2 || !fitsLeft);
  return {
    left: right ? point.x + gap : clamp(point.x - gap - size.width, 0, maxLeft),
    top: clamp(point.y - size.height / 2, bounds.top, bounds.height - size.height),
  };
}
