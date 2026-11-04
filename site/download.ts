/**
 * Download page: puts the visitor's platform first, then fills in the current
 * version, file sizes and checksums from the release manifest. The links work
 * without this script: the Worker always serves the latest build.
 */
import { ASSETS, MANIFEST_PATH, isReleaseManifest, type ReleaseManifest } from './releases';
import { detectPlatform } from './platform';

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
    const asset = manifest.assets[link.dataset.asset ?? ''];
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
    if (isReleaseManifest(manifest)) showRelease(manifest);
    else showNoRelease();
  } catch {
    // Offline or blocked: leave the links alone, they may still work.
  }
}

void loadRelease();
