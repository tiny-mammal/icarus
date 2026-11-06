import { describe, expect, it } from 'vitest';
import { detectPlatform, isAppleMobile } from '../src/lib/user-agent';

/** A navigator with just the fields the sniffing reads. */
const nav = (userAgent: string, maxTouchPoints = 0) => ({ userAgent, maxTouchPoints }) as Navigator;

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPADOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

describe('isAppleMobile', () => {
  it('recognises iPhone and iPadOS, which reports itself as a Mac with touch', () => {
    expect(isAppleMobile(nav(IPHONE, 5))).toBe(true);
    expect(isAppleMobile(nav(IPADOS, 5))).toBe(true);
  });

  it('leaves Macs, Android and Windows alone', () => {
    expect(isAppleMobile(nav(IPADOS, 0))).toBe(false);
    expect(isAppleMobile(nav(ANDROID, 5))).toBe(false);
    expect(isAppleMobile(nav(WINDOWS))).toBe(false);
  });
});

describe('detectPlatform', () => {
  it('offers no download on iPhone or iPad', () => {
    expect(detectPlatform(nav(IPHONE, 5))).toBeNull();
    expect(detectPlatform(nav(IPADOS, 5))).toBeNull();
  });

  it('names the desktop and Android platforms', () => {
    expect(detectPlatform(nav(IPADOS, 0))).toBe('macos');
    expect(detectPlatform(nav(ANDROID, 5))).toBe('android');
    expect(detectPlatform(nav(WINDOWS))).toBe('windows');
  });
});
