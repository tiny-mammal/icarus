import { describe, expect, it } from 'vitest';
import { assetPath, compareVersions, releasedAsset } from '../site/releases';

describe('release version precedence', () => {
  it('orders versions by SemVer, including pre-releases', () => {
    const ordered = ['0.9.0', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0', '1.0.1', '1.10.0'];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(compareVersions(ordered[i], ordered[i + 1]), `${ordered[i]} < ${ordered[i + 1]}`).toBeLessThan(0);
      expect(compareVersions(ordered[i + 1], ordered[i])).toBeGreaterThan(0);
    }
    expect(compareVersions('1.0.0+build.5', '1.0.0')).toBe(0);
  });

  it('pins any SemVer release, including build metadata, and nothing else', () => {
    expect(releasedAsset('linux-deb', '1.0.0+build.5')?.key).toBe('v1.0.0+build.5/Icarus-Diary-1.0.0+build.5-linux-x86_64.deb');
    expect(releasedAsset('linux-deb', '1.0.0-rc.1')).not.toBeNull();
    expect(assetPath('linux-deb', '1.0.0+build.5')).toBe('/download/linux-deb?version=1.0.0%2Bbuild.5');
    for (const bad of ['../1.0.0', '1.0', '1.0.0/x', '']) expect(releasedAsset('linux-deb', bad)).toBeNull();
    expect(releasedAsset('nope', '1.0.0')).toBeNull();
  });
});
