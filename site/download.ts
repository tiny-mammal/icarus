/**
 * Download page: puts the visitor's platform first, then fills in the current
 * version, file sizes and checksums from the release manifest. The links work
 * without this script: the Worker always serves the latest build.
 */
import {
  ASSETS,
  MANIFEST_PATH,
  assetPath,
  compareVersions,
  isReleaseManifest,
  type PlatformId,
  type ReleaseManifest,
} from './releases';
import { detectPlatform } from './platform';
import { isVersion } from '../src/lib/semver';

const platform = detectPlatform();
if (platform) {
  const card = document.querySelector<HTMLElement>(`[data-platform="${platform}"]`);
  card?.parentElement?.prepend(card);
  card?.querySelector('[data-detected]')?.classList.remove('hidden');
}

const status = document.querySelector<HTMLElement>('[data-release-status]');

function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1_000_000))} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showRelease(manifest: ReleaseManifest): void {
  if (status) status.textContent = `Version ${manifest.version}, released ${formatDate(manifest.published)}`;
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-asset]')) {
    const id = link.dataset.asset ?? '';
    const asset = manifest.assets[id];
    // Download the release whose sizes and checksums this page shows, even
    // if a newer one is published while the page is open.
    if (asset) link.href = assetPath(id, manifest.version);
    const size = link.querySelector('[data-asset-size]');
    if (asset && size) size.textContent = `· ${formatSize(asset.size)}`;
  }
  const list = document.querySelector('[data-checksums]');
  if (!list) return;
  for (const spec of ASSETS) {
    const asset = manifest.assets[spec.id];
    if (!asset) continue;
    const term = document.createElement('dt');
    term.className = 'text-xs text-text';
    term.textContent = asset.name;
    const value = document.createElement('dd');
    value.className = 'break-all font-mono text-xs';
    value.textContent = asset.sha256;
    list.append(term, value);
  }
}

/** The version the app says is installed (`?installed=` from its update reminder). */
function installedVersion(): string | null {
  const value = new URLSearchParams(location.search).get('installed');
  return value && isVersion(value) ? value : null;
}

/** How to install over the current version, per platform. */
const UPDATE_STEPS: Record<PlatformId, string> = {
  android:
    "Download the APK below, open it and tap Update. Android keeps your diary. Don't uninstall the old version first: that erases the diary.",
  windows: 'Run the new installer. It replaces this version, and your diary stays in its folder.',
  macos: 'Open the disk image and drag Icarus to Applications, replacing the old one. Your diary stays in its folder.',
  linux:
    'Install the new package over the old one, or swap in the new AppImage and delete the old file. Your diary stays in its folder.',
};

/** Tell someone who came from the app whether there is anything new. */
function showUpdateCheck(manifest: ReleaseManifest): void {
  const installed = installedVersion();
  const box = document.querySelector<HTMLElement>('[data-update-check]');
  const title = box?.querySelector('[data-update-title]');
  const detail = box?.querySelector('[data-update-detail]');
  if (!installed || !box || !title || !detail) return;
  const newer = compareVersions(manifest.version, installed) > 0;
  box.dataset.state = newer ? 'newer' : 'current';
  if (newer) {
    title.textContent = `Icarus ${manifest.version} is out. You have ${installed}.`;
    detail.textContent = platform ? UPDATE_STEPS[platform] : 'Pick your system below and install over your current version.';
  } else {
    title.textContent = `You're up to date with ${installed}.`;
    detail.textContent = "There's nothing new to install. Icarus will ask again in a month.";
  }
  box.classList.remove('hidden');
}

function showNoRelease(): void {
  if (status) status.textContent = 'The first release is on its way. Until then, you can write in the web app.';
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-asset]')) {
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.classList.add('pointer-events-none', 'opacity-40');
  }
}

async function loadRelease(): Promise<void> {
  try {
    const response = await fetch(MANIFEST_PATH, { headers: { Accept: 'application/json' } });
    const manifest: unknown = response.ok ? await response.json() : null;
    if (isReleaseManifest(manifest)) {
      showRelease(manifest);
      showUpdateCheck(manifest);
    } else showNoRelease();
  } catch {
    // Offline or blocked: leave the links alone, they may still work.
  }
}

void loadRelease();
