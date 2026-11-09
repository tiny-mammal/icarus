// The tooltip action drives DOM events and a shared bubble, so this suite runs in jsdom.
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LONG_PRESS, tooltip } from '../src/lib/tooltip';

const bubble = () => document.querySelector<HTMLElement>('[role="tooltip"]');
const isOpen = () => bubble()?.hasAttribute('data-open') ?? false;

function mouse(type: 'pointerenter' | 'pointerleave', el: HTMLElement, pointerType = 'mouse') {
  const e = new Event(type);
  Object.assign(e, { pointerType });
  el.dispatchEvent(e);
}

function press(type: string, el: HTMLElement, x = 0, y = 0) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: x, clientY: y });
  el.dispatchEvent(e);
  return e;
}

function button(label?: string): HTMLButtonElement {
  const el = document.createElement('button');
  if (label) el.setAttribute('aria-label', label);
  document.body.append(el);
  return el;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('tooltip action', () => {
  it('shows after a hover delay with shortcut chips, and hides on leave', () => {
    vi.useFakeTimers();
    const el = button();
    tooltip(el, { label: 'Save entry', keys: ['⌘/Ctrl', '↵'] });

    mouse('pointerenter', el);
    expect(isOpen()).toBe(false);
    vi.advanceTimersByTime(500);
    expect(isOpen()).toBe(true);
    expect(bubble()!.textContent).toBe('Save entry⌘/Ctrl↵');
    expect([...bubble()!.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(['⌘/Ctrl', '↵']);
    expect(el.getAttribute('aria-describedby')).toBe(bubble()!.id);

    mouse('pointerleave', el);
    expect(isOpen()).toBe(false);
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('switches instantly between neighbouring controls', () => {
    vi.useFakeTimers();
    const a = button();
    const b = button();
    tooltip(a, 'First');
    tooltip(b, 'Second');

    mouse('pointerenter', a);
    vi.advanceTimersByTime(500);
    mouse('pointerleave', a);
    mouse('pointerenter', b);
    expect(isOpen()).toBe(true);
    expect(bubble()!.textContent).toBe('Second');
  });

  it('ignores touch and does not duplicate the accessible name', () => {
    vi.useFakeTimers();
    const el = button('Lock diary');
    tooltip(el, 'Lock diary');

    mouse('pointerenter', el, 'touch');
    vi.advanceTimersByTime(500);
    expect(isOpen()).toBe(false);

    mouse('pointerenter', el);
    vi.advanceTimersByTime(500);
    expect(isOpen()).toBe(true);
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('updates live and hides when its control goes away', () => {
    vi.useFakeTimers();
    const el = button();
    const action = tooltip(el, 'Full screen');
    mouse('pointerenter', el);
    vi.advanceTimersByTime(500);

    action.update('Exit full screen');
    expect(bubble()!.textContent).toBe('Exit full screen');

    action.destroy();
    expect(isOpen()).toBe(false);
  });

  it('skips truncation-only hints while the text fits', () => {
    vi.useFakeTimers();
    const el = button();
    tooltip(el, { label: 'A long title', truncatedOnly: true });
    mouse('pointerenter', el);
    vi.advanceTimersByTime(500);
    expect(isOpen()).toBe(false);

    Object.defineProperty(el, 'scrollWidth', { value: 120 });
    Object.defineProperty(el, 'clientWidth', { value: 80 });
    mouse('pointerenter', el);
    vi.advanceTimersByTime(500);
    expect(isOpen()).toBe(true);
  });

  it('shows on a touch long press and swallows the click that follows', () => {
    vi.useFakeTimers();
    const el = button();
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    tooltip(el, 'Statistics');

    press('pointerdown', el);
    vi.advanceTimersByTime(LONG_PRESS);
    expect(isOpen()).toBe(true);
    expect(press('contextmenu', el).defaultPrevented).toBe(true);
    press('pointerup', el);
    press('pointerleave', el);
    el.click();
    expect(clicks).toBe(0);
    expect(isOpen()).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(isOpen()).toBe(false);
    el.click();
    expect(clicks).toBe(1);
  });

  it('leaves quick taps and drags alone', () => {
    vi.useFakeTimers();
    const el = button();
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    tooltip(el, 'Statistics');

    press('pointerdown', el);
    vi.advanceTimersByTime(100);
    press('pointerup', el);
    el.click();
    expect(clicks).toBe(1);

    press('pointerdown', el);
    press('pointermove', el, 0, 30);
    vi.advanceTimersByTime(LONG_PRESS);
    expect(isOpen()).toBe(false);
  });
});
