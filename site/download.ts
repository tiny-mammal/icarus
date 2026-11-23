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
  type ReleaseManifest,
} from './releases';
import { detectPlatform } from '../src/lib/user-agent';
import { isVersion } from '../src/lib/semver';
// Promo tracking and the language menu.
import './main';
import { fmt, lang, strings } from './strings';


const platform = detectPlatform();
if (platform) {
  const card = document.querySelector<HTMLElement>(`[data-platform="${platform}"]`);
  card?.parentElement?.prepend(card);
  card?.querySelector('[data-detected]')?.classList.remove('hidden');
}

const status = document.querySelector<HTMLElement>('[data-release-status]');

function formatSize(bytes: number): string {
  return fmt(strings.size, { size: Math.max(1, Math.round(bytes / 1_000_000)) });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
}

function showRelease(manifest: ReleaseManifest): void {
  if (status) status.textContent = fmt(strings.release, { version: manifest.version, date: formatDate(manifest.published) });
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
    title.textContent = fmt(strings.updateNewer, { latest: manifest.version, installed });
    detail.textContent = platform ? strings.updateSteps[platform] : strings.updatePick;
  } else {
    title.textContent = fmt(strings.updateCurrent, { installed });
    detail.textContent = strings.updateNothing;
  }
  box.classList.remove('hidden');
}

function showNoRelease(): void {
  if (status) status.textContent = strings.noRelease;
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
