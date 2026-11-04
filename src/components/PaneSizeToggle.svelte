<script lang="ts">
  import { app } from '../lib/store.svelte';

  // Wide screens only: let the day pane fill the window (or slide back to the
  // side). Phones always show the pane full screen, so it's hidden there.
  const label = $derived(app.paneExpanded ? 'Exit full screen' : 'Full screen');
</script>

<button
  class="hidden h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text sm:grid"
  aria-label={label}
  aria-pressed={app.paneExpanded}
  title="{label} (F)"
  onclick={() => (app.paneExpanded = !app.paneExpanded)}
>
  {#if app.paneExpanded}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3m13-5h-3a2 2 0 0 0-2 2v3"/></svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>
  {/if}
</button>
