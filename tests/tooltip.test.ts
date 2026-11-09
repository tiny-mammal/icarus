// The tooltip action drives DOM events and a shared bubble, so this suite runs in jsdom.
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tooltip } from '../src/lib/tooltip';

const bubble = () => document.querySelector<HTMLElement>('[role="tooltip"]');
const isOpen = () => bubble()?.hasAttribute('data-open') ?? false;

function mouse(type: 'pointerenter' | 'pointerleave', el: HTMLElement, pointerType = 'mouse') {
  const e = new Event(type);
  Object.assign(e, { pointerType });
  el.dispatchEvent(e);
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
});
