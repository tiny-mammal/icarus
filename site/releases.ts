/**
 * The downloadable builds, shared by the release workflow
 * (`scripts/release-assets.ts`), the Worker that serves them (`worker.ts`) and
 * the download page (`download.ts`).
 *
 * Builds live in the R2 bucket bound as `RELEASES`: each release under
 * `v<version>/`, and `latest.json` at the root pointing at the current one.
 * The manifest is written last, so a half-uploaded release is never served.
 */
import { isVersion } from '../src/lib/semver.ts';
import type { PlatformId } from '../src/lib/user-agent.ts';

export { compareVersions } from '../src/lib/semver.ts';
export type { PlatformId };

export interface AssetSpec {
  /** Stable id in the public URL: `/download/<id>`. */
  id: string;
  platform: PlatformId;
  /** Short label for the download button. */
  label: string;
  /**
   * Directory that holds the file, under Tauri's `bundle/` output for desktop
   * and under `app/build/outputs/apk/` for Android.
   */
  bundleDir: string;
  /** File extension of the bundled file, without the dot. */
  extension: string;
}

/** Ordered by preference: the first asset of each platform is its main download. */
export const ASSETS: readonly AssetSpec[] = [
  { id: 'windows-setup', platform: 'windows', label: 'Installer (.exe)', bundleDir: 'nsis', extension: 'exe' },
  { id: 'windows-msi', platform: 'windows', label: 'MSI package', bundleDir: 'msi', extension: 'msi' },
  { id: 'macos-dmg', platform: 'macos', label: 'Disk image (.dmg)', bundleDir: 'dmg', extension: 'dmg' },
  { id: 'linux-appimage', platform: 'linux', label: 'AppImage', bundleDir: 'appimage', extension: 'AppImage' },
  { id: 'linux-deb', platform: 'linux', label: 'Debian / Ubuntu (.deb)', bundleDir: 'deb', extension: 'deb' },
  { id: 'linux-rpm', platform: 'linux', label: 'Fedora / openSUSE (.rpm)', bundleDir: 'rpm', extension: 'rpm' },
  { id: 'android-apk', platform: 'android', label: 'APK', bundleDir: 'universal/release', extension: 'apk' },
];

export interface ReleaseAsset {
  /** Object key in the bucket, e.g. `v0.2.0/Icarus-Diary-0.2.0-linux-x86_64.AppImage`. */
  key: string;
  /** File name offered to the browser. */
  name: string;
  size: number;
  sha256: string;
}

export interface ReleaseManifest {
  version: string;
  /** ISO 8601 timestamp of the publish. */
  published: string;
  assets: Record<string, ReleaseAsset>;
}

export const MANIFEST_KEY = 'latest.json';
export const MANIFEST_PATH = `/download/${MANIFEST_KEY}`;

/**
 * Public URL of an asset. Without a version it is the latest build; with one
 * it stays on that release, so a page that shows a release's checksums
 * downloads exactly those files even if a newer release lands meanwhile.
 */
export function assetPath(id: string, version?: string): string {
  return version ? `/download/${id}?version=${encodeURIComponent(version)}` : `/download/${id}`;
}

/** Where a given release keeps asset `id`, or null for an unknown id or version. */
export function releasedAsset(id: string, version: string): { key: string; name: string } | null {
  const spec = ASSETS.find((asset) => asset.id === id);
  if (!spec || !isVersion(version)) return null;
  const name = assetFileName(spec, version);
  return { key: releasePrefix(version) + name, name };
}

/** Folder in the bucket that holds one release. */
export function releasePrefix(version: string): string {
  return `v${version}/`;
}

/** The file name every build of `spec` is published as. */
export function assetFileName(spec: AssetSpec, version: string): string {
  const arch = spec.platform === 'macos' || spec.platform === 'android' ? 'universal' : 'x86_64';
  return `Icarus-Diary-${version}-${spec.platform}-${arch}.${spec.extension}`;
}

export function isReleaseManifest(value: unknown): value is ReleaseManifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as Partial<ReleaseManifest>;
  return (
    typeof manifest.version === 'string' &&
    typeof manifest.published === 'string' &&
    !!manifest.assets &&
    typeof manifest.assets === 'object'
  );
}
