<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { app } from '../lib/store.svelte';

  const dotColor: Record<string, string> = {
    info: 'bg-muted',
    success: 'bg-text',
    error: 'bg-red-400',
  };

  // Group toasts by announcement priority: errors deserve to interrupt the
  // current speech (`assertive`), everything else can wait politely.
  function ariaProps(level: 'info' | 'success' | 'error') {
    return level === 'error'
      ? { role: 'alert' as const, 'aria-live': 'assertive' as const }
      : { role: 'status' as const, 'aria-live': 'polite' as const };
  }

  // Run a toast's inline action (e.g. Undo) and dismiss it immediately so it
  // can't fire twice.
  function runAction(toast: (typeof app.toasts)[number]) {
    toast.action?.run();
    app.dismiss(toast.id);
  }
</script>

<!-- A polite live region for success/info; we render each error with an
     `alert` role so screen readers interrupt instead of waiting. -->
<div
  class="pointer-events-none fixed inset-x-0 top-[calc(4.5rem+env(safe-area-inset-top))] z-toast flex flex-col items-center gap-2 px-4"
  role="region"
  aria-label="Notifications"
>
  {#each app.toasts as toast (toast.id)}
    <div
      class="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-slate bg-surface/95 px-4 py-2.5 text-sm text-text shadow-xl shadow-black/40 backdrop-blur-xl"
      transition:fly={{ y: -12, duration: 220 }}
      animate:flip={{ duration: 200 }}
      {...ariaProps(toast.level)}
    >
      <span class="h-1.5 w-1.5 rounded-full {dotColor[toast.level]}"></span>
      <span>{toast.message}</span>
      {#if toast.action}
        <button
          class="-my-1 ml-1 rounded-md px-2 py-1 text-xs font-semibold text-text underline-offset-2 transition-colors hover:bg-slate hover:underline"
          onclick={() => runAction(toast)}
        >
          {toast.action.label}
        </button>
      {/if}
    </div>
  {/each}
</div>
