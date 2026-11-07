// The spellCheck action mutates DOM properties, so this suite runs in jsdom.
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { spellCheck, trapFocus } from '../src/lib/actions';
import { dismissTopLayer, layerOpen } from '../src/lib/back-button.svelte';

describe('spellCheck action', () => {
  it('toggles checking and pins the language to English', () => {
    const el = document.createElement('div');
    const action = spellCheck(el, true);
    expect(el.spellcheck).toBe(true);
    expect(el.lang).toBe('en');

    action.update(false);
    expect(el.spellcheck).toBe(false);
    expect(el.lang).toBe('en');
  });
});

describe('back button layers', () => {
  it('counts focus-trapped layers and dismisses the top one like Escape', () => {
    const el = document.createElement('div');
    el.innerHTML = '<button>Close</button>';
    document.body.append(el);
    let closed = 0;
    const action = trapFocus(el, () => closed++);
    expect(layerOpen()).toBe(true);

    // jsdom has no layout, so focus the control the action would focus.
    el.querySelector('button')!.focus();
    dismissTopLayer();
    expect(closed).toBe(1);

    action.destroy();
    expect(layerOpen()).toBe(false);
    el.remove();
  });
});
