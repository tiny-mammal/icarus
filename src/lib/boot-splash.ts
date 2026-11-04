/**
 * The boot splash is static markup in `index.html`, so something is on screen
 * while the app bundle downloads. It stays over the app until the first screen
 * is rendered with its real fonts, then fades out without moving anything.
 */

/** Inter faces used by every first screen (see `vite/preload-fonts.ts`). */
const FIRST_PAINT_FONTS = ['400 1em Inter', '500 1em Inter', '600 1em Inter'];

/** Never hold the splash longer than this waiting for fonts. */
const FONT_WAIT_MS = 600;

/** Fallback removal for when `transitionend` never fires (e.g. hidden tab). */
const FADE_MS = 400;

let dismissed = false;

function fontsReady(): Promise<unknown> {
  const fonts = document.fonts;
  if (!fonts) return Promise.resolve();
  return Promise.race([
    Promise.all(FIRST_PAINT_FONTS.map((font) => fonts.load(font))).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}

/** Fade out and remove the boot splash. Safe to call more than once. */
export async function dismissBootSplash(): Promise<void> {
  if (dismissed) return;
  dismissed = true;
  const splash = document.getElementById('boot');
  if (!splash) return;
  await fontsReady();
  // Let the first screen paint underneath before uncovering it.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const remove = () => splash.remove();
  splash.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, FADE_MS);
  splash.classList.add('boot-done');
}
