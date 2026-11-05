/**
 * The Icarus mark and a minimal PNG encoder, shared by the icon scripts. Pure
 * Node (zlib only), so everything runs fully offline.
 *
 * The mark: a thin luminous ring with a muted center dot on deep-ink black —
 * the same monochrome identity as the app. Keep `public/favicon.svg` in sync.
 */
import { deflateSync } from 'node:zlib';

export const INK = [9, 9, 11]; //  #09090b background
export const INK_HEX = '#09090b';
const CRISP = [250, 250, 250]; // #fafafa ring
const MUTED = [113, 113, 122]; // #71717a center dot

// Mark geometry on a 1024 grid.
const R_OUTER = 360;
const R_INNER = 300;
const R_DOT = 70;
const GRID = 1024;

// Soft anti-aliased coverage for a circle boundary at radius `r`.
const edge = (d, r) => Math.max(0, Math.min(1, r + 1.0 - d));

/**
 * Renders the mark into a `size`x`size` RGBA buffer.
 *
 * @param size    Canvas edge in pixels.
 * @param options.markScale  Mark size relative to the canvas (1 = the full-bleed
 *                           app icon; smaller leaves a margin).
 * @param options.transparent  Leave the background transparent instead of ink.
 */
export function renderMark(size, { markScale = 1, transparent = false } = {}) {
  const k = (size / GRID) * markScale;
  const [rOuter, rInner, rDot] = [R_OUTER * k, R_INNER * k, R_DOT * k];
  const c = size / 2;
  const px = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);

      const ring = edge(d, rOuter) * (1 - edge(d, rInner));
      const dot = edge(d, rDot);

      let rgb = INK;
      let alpha = 255;
      if (transparent) {
        // Ring and dot never overlap, so the larger coverage wins.
        const coverage = Math.max(ring, dot);
        rgb = dot > ring ? MUTED : CRISP;
        alpha = Math.round(coverage * 255);
      } else {
        rgb = rgb.map((v, ch) => v + (CRISP[ch] - v) * ring);
        rgb = rgb.map((v, ch) => v + (MUTED[ch] - v) * dot);
      }

      px[i] = Math.round(rgb[0]);
      px[i + 1] = Math.round(rgb[1]);
      px[i + 2] = Math.round(rgb[2]);
      px[i + 3] = alpha;
    }
  }
  return px;
}

// --- Minimal PNG encoder (RGBA, 8-bit, filter type 0) -----------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
};

export function encodePng(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10..12 = compression / filter / interlace = 0

  // Prefix each scanline with filter byte 0.
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    px.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
