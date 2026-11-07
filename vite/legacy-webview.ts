import type { Plugin } from 'vite';

/**
 * Oldest Chromium the shipped CSS must work on. Android installs run in the
 * system WebView, which can be years behind on phones that no longer update
 * (an Android 12 Xiaomi showed broken switches and a stuck Settings sheet),
 * while Tailwind 4 emits CSS for Chromium 111+. Below 99 nothing renders:
 * Tailwind wraps every rule in cascade layers (`@layer`).
 */
const OLDEST_CHROMIUM = 'chrome99';

/**
 * CSS that breaks layout below that version and that Lightning CSS can't
 * lower. Rotate and scale utilities only lose a cosmetic effect, so they stay.
 */
const UNSUPPORTED: { pattern: RegExp; fix: string }[] = [
  {
    // The one allowed use is the @supports-guarded token in app.css.
    pattern: /(?<!--screen-h:|\(height:)\b\d*\.?\d+dvh\b/,
    fix: 'use var(--screen-h) instead of dvh (Chromium 108+)',
  },
  {
    pattern: /[{;]translate:/,
    fix: 'use [transform:translate…] instead of translate-* utilities (Chromium 104+)',
  },
  {
    // Tailwind composes touch-pan-* from custom properties, which older
    // WebViews ignore: the browser then claims every drag and cancels the
    // pointer stream, so the month pager and chart tooltips stop following.
    pattern: /touch-action:[^;}]*var\(/,
    fix: 'use [touch-action:pan-y] instead of touch-pan-* utilities',
  },
];

/**
 * Lower the bundled CSS for older WebViews (e.g. `oklch()` colors gain hex
 * fallbacks) and fail the build on CSS those WebViews can't render.
 */
export function legacyWebView(): Plugin {
  return {
    name: 'icarus-legacy-webview',
    apply: 'build',
    config: () => ({ build: { cssTarget: OLDEST_CHROMIUM, cssMinify: 'lightningcss' } }),
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue;
        const css = String(file.source);
        for (const { pattern, fix } of UNSUPPORTED) {
          const match = pattern.exec(css);
          if (!match) continue;
          const context = css.slice(Math.max(0, match.index - 60), match.index + 40);
          this.error(`${file.fileName}: ${fix}, near "${context}"`);
        }
      }
    },
  };
}
