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
 * CSS that breaks below that version and that Lightning CSS can't lower.
 */
const UNSUPPORTED: { pattern: RegExp; fix: string }[] = [
  {
    // The one allowed use is the @supports-guarded token in app.css.
    pattern: /(?<!--screen-h:|\(height:)\b\d*\.?\d+dvh\b/,
    fix: 'use var(--screen-h) instead of dvh (Chromium 108+)',
  },
  {
    // Tailwind 4 emits the individual transform properties, which older
    // WebViews drop: a flipped arrow would point the wrong way.
    pattern: /[{;](translate|rotate|scale):/,
    fix: 'use [transform:translate…|rotate…|scale…] instead of translate-*, rotate-* and scale-* utilities (Chromium 104+)',
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
 * The first `color-mix()` over a custom property that has no fallback, with
 * some context, or null. Lightning CSS can only lower `color-mix()` of literal
 * colours, and Tailwind adds fallbacks for its own utilities (the guarded copy
 * sits in an `@supports (…color-mix…)` block), but a component's <style> gets
 * neither: below Chromium 111 the declaration is dropped. Use a literal colour
 * there, or compute it in script.
 */
export function unguardedColorMix(css: string): string | null {
  // For each open block: whether it, or a block around it, only applies
  // where color-mix() is supported.
  const guarded: boolean[] = [];
  let blockStart = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      const head = css.slice(blockStart, i);
      guarded.push((guarded.at(-1) ?? false) || /^\s*@supports[^{]*color-mix/.test(head));
      blockStart = i + 1;
    } else if (c === '}') {
      guarded.pop();
      blockStart = i + 1;
    } else if (c === ';') {
      blockStart = i + 1;
    } else if (css.startsWith('color-mix(', i) && !(guarded.at(-1) ?? false)) {
      let depth = 0;
      let end = i;
      for (; end < css.length; end++) {
        if (css[end] === '(') depth++;
        else if (css[end] === ')' && --depth === 0) break;
      }
      const call = css.slice(i, end + 1);
      // A color-mix() inside an @supports condition is the test, not a use.
      if (call.includes('var(') && !/^\s*@supports/.test(css.slice(blockStart, i))) {
        return css.slice(Math.max(0, i - 60), end + 1);
      }
      i = end;
    }
  }
  return null;
}

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
        const mix = unguardedColorMix(css);
        if (mix) {
          this.error(
            `${file.fileName}: color-mix() over a custom property has no fallback below Chromium 111; use a literal colour or compute it in script, near "${mix}"`,
          );
        }
      }
    },
  };
}
