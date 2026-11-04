/**
 * The downloadable builds, shared by the release workflow
 * (`scripts/release-assets.ts`), the Worker that serves them (`worker.ts`) and
 * the download page (`download.ts`).
 *
 * Builds live in the R2 bucket bound as `RELEASES`: each release under
 * `v<version>/`, and `latest.json` at the root pointing at the current one.
 * The manifest is written last, so a half-uploaded release is never served.
 */

export type PlatformId = 'windows' | 'macos' | 'linux';

export interface AssetSpec {
  /** Stable id in the public URL: `/download/<id>`. */
  id: string;
  platform: PlatformId;
  /** Short label for the download button. */
  label: string;
  /** Directory under `target/<triple>/release/bundle/` that holds the file. */
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
];

export interface ReleaseAsset {
  /** Object key in the bucket, e.g. `v0.2.0/Icarus-Diary-0.2.0-x86_64.AppImage`. */
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

export function assetPath(id: string): string {
  return `/download/${id}`;
}

/** Folder in the bucket that holds one release. */
export function releasePrefix(version: string): string {
  return `v${version}/`;
}

/** The file name every build of `spec` is published as. */
export function assetFileName(spec: AssetSpec, version: string): string {
  const arch = spec.platform === 'macos' ? 'universal' : 'x86_64';
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
