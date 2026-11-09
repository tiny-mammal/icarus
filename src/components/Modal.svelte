<script module lang="ts">
  // Open modals, innermost last: only the top one answers a stray Escape.
  const stack: symbol[] = [];
</script>

<script lang="ts">
  import { tooltip } from '../lib/tooltip';
  import { onDestroy, type Snippet } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { trapFocus } from '../lib/actions';
  import { dragToDismiss } from '../lib/gestures';
  import { viewport } from '../lib/viewport.svelte';

  /**
   * Shared modal shell. On wide screens it is a centred card over a blurred
   * backdrop; on phones it becomes a bottom sheet that slides up, sits within
   * thumb reach and can be pulled down to dismiss. The header stays put while
   * the body scrolls. Escape, a backdrop tap and the pull-down call `onclose`
   * unless the dialog is `locked` (e.g. while an irreversible step is running).
   */
  let {
    title,
    titleHidden = false,
    subtitle,
    onclose,
    locked = false,
    width = 'sm:max-w-sm',
    z = 'z-dialog',
    divided = false,
    bodyClass = 'px-6',
    actions,
    children,
  }: {
    title: string;
    /**
     * Keep the title for screen readers only, for content that heads itself
     * (e.g. the calendar's month). Drops the header row, Close included: the
     * backdrop, Escape, back and the pull-down still dismiss it.
     */
    titleHidden?: boolean;
    /** Secondary line under the title, e.g. progress through a multi-step flow. */
    subtitle?: string;
    onclose: () => void;
    locked?: boolean;
    /** Max width on wide screens (phones always use the full width). */
    width?: string;
    /** Stacking layer (a `z-*` token from app.css), e.g. `z-sheet` for top-level panels. */
    z?: string;
    /** Separate the header from the body with a rule. */
    divided?: boolean;
    /** Horizontal padding (and any extra classes) for the scrolling body. */
    bodyClass?: string;
    /** Extra header controls, placed before the Close button. */
    actions?: Snippet;
    children: Snippet;
  } = $props();

  const titleId = `modal-${Math.random().toString(36).slice(2)}`;
  const id = Symbol('modal');
  stack.push(id);
  onDestroy(() => stack.splice(stack.indexOf(id), 1));

  let card = $state<HTMLElement | null>(null);

  function close() {
    if (!locked) onclose();
  }

  // The sheet slides up from the bottom edge on phones and scales in elsewhere.
  function enter(node: HTMLElement) {
    if (viewport.reducedMotion) return fade(node, { duration: 120 });
    return viewport.compact
      ? fly(node, { y: '100%', opacity: 1, duration: 280, easing: cubicOut })
      : scale(node, { duration: 180, start: 0.96, easing: cubicOut });
  }

  // Focus normally sits inside the card, whose own handler (trapFocus) closes
  // it, so nested controls such as an open listbox get Escape first. This
  // capture listener covers focus that strayed outside (e.g. to the body).
  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== id) return;
      if (card?.contains(document.activeElement)) return;
      e.stopPropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
</script>

<div
  class="fixed inset-0 {z} flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center sm:p-4"
  transition:fade={{ duration: 160 }}
  onclick={close}
  role="presentation"
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    bind:this={card}
    class="flex max-h-[calc(var(--screen-h)-1.5rem)] w-full {width} flex-col overflow-hidden rounded-t-2xl border border-b-0 border-slate bg-surface shadow-2xl shadow-black/50 focus:outline-none sm:max-h-[calc(var(--screen-h)-2rem)] sm:rounded-2xl sm:border-b"
    transition:enter
    onclick={(e) => e.stopPropagation()}
    use:trapFocus={{ onClose: close, initial: 'container' }}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
  >
    <div
      class="shrink-0 touch-none px-6 pt-2.5 sm:touch-auto sm:pt-5 {titleHidden ? 'pb-3' : divided ? 'border-b border-slate pb-4' : 'pb-4'}"
      use:dragToDismiss={{ sheet: card, ondismiss: close, enabled: viewport.compact && !locked }}
    >
      <!-- Grab handle: phones only, where the card is a pull-down sheet. -->
      <div class="mx-auto h-1 w-9 rounded-full bg-faint sm:hidden {titleHidden ? '' : 'mb-3'}" aria-hidden="true"></div>
      {#if titleHidden}
        <h2 id={titleId} class="sr-only">{title}</h2>
      {:else}
        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0">
            <h2 id={titleId} class="text-base font-semibold tracking-tight text-text">{title}</h2>
            {#if subtitle}<p class="mt-0.5 text-xs text-muted">{subtitle}</p>{/if}
          </div>
          <div class="-mr-1.5 flex shrink-0 items-center gap-2">
            {@render actions?.()}
            {#if !locked}
              <button
                class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
                aria-label="Close"
                use:tooltip={{ label: 'Close', keys: ['Esc'] }}
                onclick={close}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
    <div
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 {divided ? 'pt-5' : ''} {bodyClass}"
    >
      {@render children()}
    </div>
  </div>
</div>
