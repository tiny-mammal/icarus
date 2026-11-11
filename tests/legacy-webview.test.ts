import { describe, expect, it } from 'vitest';
import { unguardedColorMix } from '../vite/legacy-webview';

describe('unguardedColorMix', () => {
  it('flags color-mix() over a custom property with no fallback', () => {
    expect(unguardedColorMix('.a{color:color-mix(in oklab, var(--x) 5%, red)}')).toContain('var(--x)');
  });

  it('allows the copies guarded by @supports, and literal colours', () => {
    const css = [
      '.a{color:#f00}',
      '@supports (color:color-mix(in lab,red,red)){.a{color:color-mix(in oklab, var(--x) 5%, red)}}',
      '@media (hover:hover){@supports (color:color-mix(in lab,red,red)){.b:hover{color:color-mix(in oklab,var(--y) 9%,red)}}}',
      '.c{color:color-mix(in oklab, #f5b452 9%, transparent)}',
    ].join('');
    expect(unguardedColorMix(css)).toBeNull();
  });

  it('finds one after a guarded block has closed', () => {
    const css = '@supports (color:color-mix(in lab,red,red)){.a{color:color-mix(in oklab,var(--x) 5%,red)}}.b{color:color-mix(in oklab,var(--y) 5%,red)}';
    expect(unguardedColorMix(css)).toContain('var(--y)');
  });
});
