/**
 * The download buttons link to the download page, which lists every platform.
 * Name the visitor's system on them when it can be told, and point at its
 * section of that page. iPhone and iPad have no download, so there the web app
 * becomes the main action instead.
 */
import { PLATFORM_NAMES, detectPlatform, isAppleMobile } from '../src/lib/user-agent';

const platform = detectPlatform();

if (platform) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-download]')) {
    link.href = `/download#${platform}`;
    const label = link.querySelector('[data-download-label]');
    if (label) label.textContent = `Download for ${PLATFORM_NAMES[platform]}`;
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
  if (note) note.textContent = 'On iPhone and iPad, open the web app and add it to your Home Screen to use it like any other app.';
}
