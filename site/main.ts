/**
 * The download buttons link to the download page, which lists every platform.
 * Name the visitor's system on them when it can be told, and point at its
 * section of that page.
 */
import { PLATFORM_NAMES, detectPlatform } from './platform';

const platform = detectPlatform();

if (platform) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-download]')) {
    link.href = `/download#${platform}`;
    const label = link.querySelector('[data-download-label]');
    if (label) label.textContent = `Download for ${PLATFORM_NAMES[platform]}`;
  }
}
