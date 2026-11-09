<script lang="ts">
  import { tooltip } from '../lib/tooltip';
  import { fade } from 'svelte/transition';
  import { app } from '../lib/store.svelte';

  /**
   * The primary "write" action: starts a new entry dated today (work in
   * progress waits in the draft strip). On wide screens it sits in the top
   * bar; on phones it floats in the bottom-right corner, within thumb reach,
   * and steps aside while a day pane (which offers its own "new entry" action)
   * is open, or while the draft strip takes its place.
   */
  let { variant }: { variant: 'header' | 'floating' } = $props();
</script>

{#snippet plus(size: number)}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
{/snippet}

{#if variant === 'header'}
  <button
    class="hidden h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-text px-3 text-sm font-medium text-ink transition-opacity hover:opacity-90 sm:flex"
    aria-label="New entry"
    use:tooltip={{ label: 'New entry', keys: ['N'] }}
    onclick={() => app.startNewEntry()}
  >
    {@render plus(16)}
    <span class="hidden md:inline">New entry</span>
  </button>
{:else if !app.selectedKey && !app.parkedDraft}
  <button
    class="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-float grid h-14 w-14 place-items-center rounded-full bg-text text-ink shadow-xl shadow-black/50 transition-transform active:[transform:scale(0.95)] sm:hidden"
    aria-label="New entry"
    onclick={() => app.startNewEntry()}
    transition:fade={{ duration: 150 }}
  >
    {@render plus(22)}
  </button>
{/if}
