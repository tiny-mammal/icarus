<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  /**
   * Shared modal shell: a blurred backdrop and a centred card. Escape and a
   * backdrop click call `onclose` unless the dialog is `locked` (e.g. while an
   * irreversible step is running). Escape is captured so it wins over the
   * app's global Escape handling.
   */
  let {
    title,
    onclose,
    locked = false,
    width = 'max-w-sm',
    children,
  }: {
    title: string;
    onclose: () => void;
    locked?: boolean;
    width?: string;
    children: Snippet;
  } = $props();

  const titleId = `modal-${Math.random().toString(36).slice(2)}`;

  function close() {
    if (!locked) onclose();
  }

  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
</script>

<div
  class="fixed inset-0 z-[65] grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
  transition:fade={{ duration: 140 }}
  onclick={close}
  role="presentation"
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="max-h-[calc(100vh-2rem)] w-full {width} overflow-y-auto rounded-2xl border border-slate bg-surface p-6 shadow-2xl shadow-black/50"
    transition:scale={{ duration: 180, start: 0.96, easing: cubicOut }}
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
  >
    <div class="mb-4 flex items-start justify-between gap-4">
      <h2 id={titleId} class="text-base font-semibold tracking-tight text-text">{title}</h2>
      {#if !locked}
        <button
          class="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
          aria-label="Close"
          onclick={close}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      {/if}
    </div>
    {@render children()}
  </div>
</div>
