<script lang="ts" module>
  export interface SelectOption<T> {
    value: T;
    label: string;
    /** Secondary line under the label, e.g. a sample of what the choice does. */
    hint?: string;
    /** Draw a rule above this option, setting it apart from the ones before. */
    separated?: boolean;
  }
</script>

<script lang="ts" generics="T extends string | number">
  import { tick, type Snippet } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade, scale } from 'svelte/transition';
  import { clickOutside } from '../lib/actions';

  /**
   * A themed dropdown: a compact trigger showing the current choice, and a
   * listbox popover hanging from it. One option (`panelValue`) may open a
   * `panel` inside the same popover instead of choosing right away, e.g. a
   * calendar for a custom range. The popover opens upwards when there is no
   * room below, so it also works at the bottom of a scrolling dialog.
   */
  let {
    value,
    options,
    onchange,
    label,
    display,
    leading,
    panelValue,
    panel,
    panelLabel,
    triggerClass = '',
    listClass = 'min-w-40',
    panelClass = '',
  }: {
    value: T;
    options: readonly SelectOption<T>[];
    onchange: (value: T) => void;
    /** What is being chosen, for assistive tech: "Date format". */
    label: string;
    /** Trigger text (defaults to the chosen option's label). */
    display?: string;
    /** Shown before the trigger text, e.g. an icon. */
    leading?: Snippet;
    /** The option that opens `panel` rather than being chosen directly. */
    panelValue?: T;
    panel?: Snippet<[{ close: () => void; back: () => void }]>;
    panelLabel?: string;
    triggerClass?: string;
    /** Width of the popover while it lists the options. */
    listClass?: string;
    /** Width and padding of the popover while it shows the panel. */
    panelClass?: string;
  } = $props();

  const shown = $derived(display ?? options.find((o) => o.value === value)?.label ?? '');

  let open = $state(false);
  let up = $state(false);
  let view = $state<'list' | 'panel'>('list');
  let selectIdx = $state(0);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let popoverEl = $state<HTMLDivElement | null>(null);

  const POPOVER_GAP = 12;

  /** Visible vertical span of the nearest scrolling ancestor, within the window. */
  function clipSpan(node: HTMLElement): { top: number; bottom: number } {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (/auto|scroll|hidden/.test(getComputedStyle(el).overflowY)) {
        const rect = el.getBoundingClientRect();
        return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
      }
    }
    return { top: 0, bottom: window.innerHeight };
  }

  /** Open downwards unless only the space above can hold the list. */
  function place() {
    if (!triggerEl || !popoverEl) return;
    const trigger = triggerEl.getBoundingClientRect();
    const clip = clipSpan(triggerEl);
    const needed = popoverEl.offsetHeight + POPOVER_GAP;
    const below = clip.bottom - trigger.bottom;
    const above = trigger.top - clip.top;
    up = below < needed && above > below;
  }

  async function openList() {
    selectIdx = Math.max(0, options.findIndex((o) => o.value === value));
    view = 'list';
    up = false;
    open = true;
    await tick();
    place();
    focusIn();
  }

  function close() {
    open = false;
    triggerEl?.focus();
  }

  function focusIn() {
    void tick().then(() => {
      const target =
        view === 'list'
          ? popoverEl?.querySelectorAll<HTMLElement>('[role="option"]')[selectIdx]
          : popoverEl?.querySelector<HTMLElement>('[tabindex="0"]');
      target?.focus();
    });
  }

  function choose(chosen: T) {
    if (panel && chosen === panelValue) {
      view = 'panel';
      focusIn();
      return;
    }
    onchange(chosen);
    close();
  }

  function backToList() {
    view = 'list';
    selectIdx = Math.max(0, options.findIndex((o) => o.value === panelValue));
    focusIn();
  }

  // One handler for the trigger and the popover, so the keys work wherever
  // focus sits inside the select. It is bound natively (see `keys`): Svelte
  // delegates `onkeydown` to the root, too late to keep an Escape from the
  // modal card's own handler.
  function keys(node: HTMLElement) {
    node.addEventListener('keydown', onKey);
    return { destroy: () => node.removeEventListener('keydown', onKey) };
  }

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        void openList();
      }
      return;
    }
    if (e.key === 'Escape') {
      // Close only the popover — the modal's own Escape handler must not fire.
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (view !== 'list') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      selectIdx = (selectIdx + delta + options.length) % options.length;
      focusIn();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      selectIdx = e.key === 'Home' ? 0 : options.length - 1;
      focusIn();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(options[selectIdx].value);
    }
  }
</script>

<div
  class="relative"
  use:keys
  use:clickOutside={() => (open = false)}
  onfocusout={(e) => {
    // Tabbing out of the select dismisses it. Moving focus within it must
    // not, nor losing it when the focused option is swapped for the panel
    // (focus drops to the body until the panel takes it).
    const wrapper = e.currentTarget;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && !wrapper.contains(active)) open = false;
    });
  }}
>
  <button
    bind:this={triggerEl}
    type="button"
    class="flex items-center gap-1.5 rounded-lg border border-slate px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text
      {open ? 'border-faint text-text' : ''} {triggerClass}"
    onclick={() => (open ? (open = false) : openList())}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label="{label}: {shown}"
  >
    {@render leading?.()}
    <span class="truncate tabular-nums">{shown}</span>
    <svg
      class="shrink-0 transition-transform {open ? '[transform:rotate(180deg)]' : ''}"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  {#if open}
    <div
      bind:this={popoverEl}
      class="absolute right-0 z-popover rounded-2xl border border-slate bg-surface shadow-2xl shadow-black/50
        {up ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'}
        {view === 'list' ? `p-1 ${listClass}` : panelClass}"
      transition:scale={{ duration: 140, start: 0.96, easing: cubicOut }}
    >
      {#if view === 'list'}
        <div role="listbox" aria-label={label} tabindex="-1">
          {#each options as option, i (option.value)}
            {#if option.separated}
              <div class="mx-2 my-1 h-px bg-slate" role="presentation"></div>
            {/if}
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors sm:py-1.5 sm:text-xs
                {i === selectIdx ? 'bg-slate text-text' : 'text-muted hover:bg-slate-soft hover:text-text'}"
              role="option"
              aria-selected={option.value === value}
              tabindex="-1"
              onclick={() => choose(option.value)}
              onpointerenter={() => (selectIdx = i)}
            >
              <span class="min-w-0">
                <span class="block whitespace-nowrap">{option.label}</span>
                {#if option.hint}
                  <span class="mt-0.5 block truncate text-[0.7rem] tabular-nums text-muted">{option.hint}</span>
                {/if}
              </span>
              {#if option.value === value}
                <svg class="shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      {:else if panel}
        <div role="dialog" aria-label={panelLabel} in:fade={{ duration: 120 }}>
          {@render panel({ close, back: backToList })}
        </div>
      {/if}
    </div>
  {/if}
</div>
