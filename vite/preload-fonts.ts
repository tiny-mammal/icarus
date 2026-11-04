import type { Plugin } from 'vite';

/**
 * Inter weights painted on first render. Fontsource's CSS only requests a font
 * once the stylesheet is parsed and text needs it, which shows the fallback
 * face first and reflows every line when Inter arrives. Preloading the Latin
 * subsets starts those downloads alongside the main script instead.
 */
const FIRST_PAINT_FONTS = /(^|\/)inter-latin-(400|500|600)-normal-[\w-]+\.woff2$/;

/** Inject `<link rel="preload">` tags for the hashed first-paint font files. */
export function preloadFonts(): Plugin {
  let base = '/';
  return {
    name: 'icarus-preload-fonts',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((file) => FIRST_PAINT_FONTS.test(file))
          .sort()
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: base + file, crossorigin: '' },
            injectTo: 'head' as const,
          }));
      },
    },
  };
}
