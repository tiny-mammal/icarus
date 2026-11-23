/**
 * The download buttons link to the download page, which lists every platform.
 * Name the visitor's system on them when it can be told, and point at its
 * section of that page. iPhone and iPad have no download, so there the web app
 * becomes the main action instead.
 */
import { PLATFORM_NAMES, detectPlatform, isAppleMobile } from '../src/lib/user-agent';
import { startPromoTracking } from './promo';
import { fmt, strings } from './strings';

startPromoTracking();

const platform = detectPlatform();

if (platform) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-download]')) {
    link.href = `${link.pathname}#${platform}`;
    const label = link.querySelector('[data-download-label]');
    if (label) label.textContent = fmt(strings.downloadFor, { platform: PLATFORM_NAMES[platform] });
  }
}

if (isAppleMobile()) {
  for (const webApp of document.querySelectorAll<HTMLAnchorElement>('[data-webapp]')) {
    const download = webApp.parentElement?.querySelector<HTMLAnchorElement>('[data-download]');
    if (!download) continue;
    webApp.classList.replace('btn-secondary', 'btn-primary');
    download.classList.replace('btn-primary', 'btn-secondary');
    download.before(webApp);
  }
  const note = document.querySelector('[data-platform-note]');
  if (note) note.textContent = strings.iosNote;
}

// The language menu is a <details>: close it on a click elsewhere or Escape.
const languageMenu = document.querySelector<HTMLDetailsElement>('[data-lang-menu]');
if (languageMenu) {
  document.addEventListener('click', (event) => {
    if (languageMenu.open && !languageMenu.contains(event.target as Node)) languageMenu.open = false;
  });
  languageMenu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !languageMenu.open) return;
    languageMenu.open = false;
    languageMenu.querySelector('summary')?.focus();
  });
}
