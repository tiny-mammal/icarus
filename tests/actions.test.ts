// The spellCheck action mutates DOM properties, so this suite runs in jsdom.
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { multiTap, spellCheck, trapFocus } from '../src/lib/actions';
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

describe('trapFocus', () => {
  function setup() {
    const trigger = document.createElement('button');
    const other = document.createElement('input');
    const popover = document.createElement('div');
    popover.innerHTML = '<button>Inside</button>';
    document.body.append(trigger, other, popover);
    trigger.focus();
    const action = trapFocus(popover);
    popover.querySelector('button')!.focus();
    const cleanup = () => [trigger, other, popover].forEach((el) => el.remove());
    return { trigger, other, popover, action, cleanup };
  }

  it('returns focus to the trigger on close', () => {
    const { trigger, action, cleanup } = setup();
    action.destroy();
    expect(document.activeElement).toBe(trigger);
    cleanup();
  });

  it('leaves focus alone if it moved elsewhere while the popover was closing', () => {
    const { other, action, cleanup } = setup();
    other.focus();
    action.destroy();
    expect(document.activeElement).toBe(other);
    cleanup();
  });
});

describe('multiTap action', () => {
  afterEach(() => vi.useRealTimers());

  function setup(options = { count: 3, onreach: () => {} }) {
    const el = document.createElement('div');
    el.innerHTML = '<span>text</span><button>button</button>';
    const action = multiTap(el, options);
    return { el, action, tap: (selector = 'span') => el.querySelector(selector)!.dispatchEvent(new MouseEvent('click', { bubbles: true })) };
  }

  it('fires after the count of taps in a row, then starts over', () => {
    let reached = 0;
    const { tap } = setup({ count: 3, onreach: () => reached++ });
    tap();
    tap();
    expect(reached).toBe(0);
    tap();
    expect(reached).toBe(1);
    tap();
    tap();
    expect(reached).toBe(1);
    tap();
    expect(reached).toBe(2);
  });

  it('starts counting again after a pause', () => {
    vi.useFakeTimers();
    let reached = 0;
    const { tap } = setup({ count: 3, onreach: () => reached++ });
    tap();
    tap();
    vi.advanceTimersByTime(2000);
    tap();
    expect(reached).toBe(0);
    tap();
    tap();
    expect(reached).toBe(1);
  });

  it('does not count taps on a button inside', () => {
    let reached = 0;
    const { tap } = setup({ count: 2, onreach: () => reached++ });
    tap('button');
    tap('button');
    tap('button');
    expect(reached).toBe(0);
  });

  it('does nothing without options, and follows new ones', () => {
    let reached = 0;
    const el = document.createElement('div');
    const action = multiTap(el, undefined);
    el.dispatchEvent(new MouseEvent('click'));
    action.update({ count: 1, onreach: () => reached++ });
    el.dispatchEvent(new MouseEvent('click'));
    expect(reached).toBe(1);
    action.destroy();
    el.dispatchEvent(new MouseEvent('click'));
    expect(reached).toBe(1);
  });
});
