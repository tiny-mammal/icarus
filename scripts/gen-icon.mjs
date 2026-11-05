/**
 * Generates the app icons.
 *
 *   node scripts/gen-icon.mjs            writes `app-icon.png`, a 1024x1024
 *                                        source that `tauri icon` expands into
 *                                        every platform format.
 *   node scripts/gen-icon.mjs --android  rewrites the Android adaptive-icon
 *                                        layers that `tauri icon` produced.
 *
 * `pnpm icon` runs both, in that order. Replace the artwork in `icon-mark.mjs`
 * any time and re-run it.
 *
 * Why the Android step exists: an adaptive icon is a 108dp canvas of which
 * launchers show only a ~72dp mask (66%) and guarantee just the central 66dp.
 * `tauri icon` stretches the full-bleed source across the whole canvas, so the
 * launcher crops the ring and the icon looks zoomed in. Here the mark is drawn
 * on a transparent layer inside the safe zone, over an ink background.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { INK_HEX, encodePng, renderMark } from './icon-mark.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function write(path, size, options) {
  const png = encodePng(renderMark(size, options), size);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  console.log(`Wrote ${path} (${size}x${size}, ${png.length} bytes)`);
}

if (process.argv.includes('--android')) {
  const res = join(root, 'src-tauri', 'icons', 'android');

  // Adaptive foreground edge in px per density (108dp canvas).
  const densities = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  // The ring's outer edge sits at 35% of the full-bleed source; scaling the mark
  // by 0.8 puts it at 28% of the canvas (30dp), inside the 33dp safe radius.
  const markScale = 0.8;
  for (const [density, size] of Object.entries(densities)) {
    write(join(res, `mipmap-${density}`, 'ic_launcher_foreground.png'), size, {
      markScale,
      transparent: true,
    });
  }

  writeFileSync(
    join(res, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="ic_launcher_background">${INK_HEX}</color>\n</resources>\n`,
  );
  console.log('Wrote the adaptive icon background color');
} else {
  write(join(root, 'app-icon.png'), 1024);
}
