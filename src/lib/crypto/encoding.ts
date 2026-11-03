/**
 * Byte/text encodings used by the encrypted vault format. Kept dependency-free
 * and chunked so multi-megabyte diaries never hit argument-count limits.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export function utf8Encode(text: string): Uint8Array<ArrayBuffer> {
  return textEncoder.encode(text);
}

export function utf8Decode(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

const CHUNK = 0x8000;

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Crockford base32: no I, L, O or U, so a recovery key copied by hand cannot
 * be misread. Lowercase input and the look-alikes are normalized on decode.
 */
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function toBase32(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(buffer << (5 - bits)) & 31];
  return out;
}

/** Decode Crockford base32; returns null on any character outside the alphabet. */
export function fromBase32(text: string): Uint8Array<ArrayBuffer> | null {
  const normalized = text
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of normalized) {
    const value = BASE32.indexOf(char);
    if (value === -1) return null;
    buffer = ((buffer << 5) | value) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
