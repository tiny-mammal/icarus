import { describe, expect, it } from 'vitest';
import { compareVersions } from '../site/releases';

describe('release version precedence', () => {
  it('orders versions by SemVer, including pre-releases', () => {
    const ordered = ['0.9.0', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0', '1.0.1', '1.10.0'];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(compareVersions(ordered[i], ordered[i + 1]), `${ordered[i]} < ${ordered[i + 1]}`).toBeLessThan(0);
      expect(compareVersions(ordered[i + 1], ordered[i])).toBeGreaterThan(0);
    }
    expect(compareVersions('1.0.0+build.5', '1.0.0')).toBe(0);
  });
});
