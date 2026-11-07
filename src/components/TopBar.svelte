<script lang="ts">
  import { flushSync, onMount } from 'svelte';
  import { fade, fly, type TransitionConfig } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { search, type SearchHit } from '../lib/search';
  import type { DiaryEntry } from '../lib/types';
  import SearchOverlay from './SearchOverlay.svelte';
  import DraftsMenu from './DraftsMenu.svelte';
  import WriteButton from './WriteButton.svelte';
  import { updates } from '../lib/updates.svelte';
  import { holdLayer } from '../lib/back-button.svelte';
  import { viewport } from '../lib/viewport.svelte';

  let query = $state('');
  let focused = $state(false);
  let activeIndex = $state(0);
  let shownCount = $state(50);
  let inputEl = $state<HTMLInputElement | null>(null);
  let searchButtonEl = $state<HTMLButtonElement | null>(null);
  // Phones fold the search into an icon; tapping it unfolds the field over
  // the whole bar, so it never has to share the width with the actions.
  let searchExpanded = $state(false);

  const hits = $derived<SearchHit[]>(search(query));
  const shownHits = $derived(hits.slice(0, shownCount));
  const open = $derived(focused && query.trim().length > 0);

  // Back closes the results, then the unfolded search (Escape on the input),
  // instead of the app.
  $effect(() => {
    if ((open || searchExpanded) && inputEl) return holdLayer(inputEl);
  });

  // Keep the active row in range as results change.
  $effect(() => {
    void query;
    activeIndex = 0;
    shownCount = 50;
  });

  $effect(() => {
    if (!viewport.compact) searchExpanded = false;
  });

  function expandSearch() {
    // Mount the field synchronously: focusing it within the tap is what
    // brings up the on-screen keyboard.
    flushSync(() => (searchExpanded = true));
    inputEl?.focus();
  }

  function collapseSearch() {
    query = '';
    searchExpanded = false;
  }

  /** Focus the search, unfolding it first on phones. */
  function focusSearch() {
    if (viewport.compact) expandSearch();
    inputEl?.focus();
    inputEl?.select();
  }

  function onBlur() {
    setTimeout(() => {
      focused = false;
      // Leaving an empty search folds it back; a query stays on screen.
      if (!query.trim() && document.activeElement !== inputEl) searchExpanded = false;
    }, 120);
  }

  /**
   * Unfold the search as a circle growing out of its icon (and fold it back
   * into it), Material-style.
   */
  function reveal(node: HTMLElement): TransitionConfig {
    if (viewport.reducedMotion) return { duration: 120, css: (t) => `opacity: ${t}` };
    const bar = node.getBoundingClientRect();
    const icon = searchButtonEl?.getBoundingClientRect();
    const x = icon ? icon.left + icon.width / 2 - bar.left : bar.width;
    const y = bar.height / 2;
    const from = icon ? icon.width / 2 : 0;
    const to = Math.hypot(Math.max(x, bar.width - x), y);
    return {
      duration: 420,
      easing: quintOut,
      css: (t) => `clip-path: circle(${from + (to - from) * t}px at ${x}px ${y}px)`,
    };
  }

  /** Reveal the next result batch without mounting every hit at once. */
  function showMore() {
    shownCount = Math.min(shownCount + 50, hits.length);
  }

  function choose(entry: DiaryEntry) {
    app.jumpToEntry(entry, query);
    query = '';
    searchExpanded = false;
    inputEl?.blur();
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'Escape') {
        collapseSearch();
        inputEl?.blur();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(activeIndex + 1, hits.length - 1);
      if (nextIndex >= shownHits.length) showMore();
      activeIndex = nextIndex;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = shownHits[activeIndex];
      if (hit) choose(hit.entry);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      query = '';
      inputEl?.blur();
    }
  }

  // Global Cmd/Ctrl+K to focus search from anywhere.
  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

{#snippet searchField()}
  <div
    class="flex items-center gap-2 rounded-lg border border-slate bg-slate-soft px-3 py-2 transition-colors focus-within:border-faint sm:py-1.5"
  >
    <svg class="shrink-0 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    <input
      bind:this={inputEl}
      bind:value={query}
      onfocus={() => (focused = true)}
      onblur={onBlur}
      onkeydown={onKeydown}
      type="text"
      enterkeyhint="search"
      aria-label="Search entries"
      placeholder="Search entries…"
      class="w-full bg-transparent text-sm text-text placeholder:text-muted focus:outline-none"
      spellcheck="false"
    />
    {#if viewport.compact && query}
      <button
        class="-my-2 -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted transition-colors hover:text-text"
        aria-label="Clear search"
        onmousedown={(e) => e.preventDefault()}
        onclick={() => {
          query = '';
          inputEl?.focus();
        }}
        transition:fade={{ duration: 120 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    {/if}
    <kbd class="hidden shrink-0 rounded border border-slate px-1.5 py-0.5 font-mono text-[0.65rem] text-muted sm:block">
      ⌘K
    </kbd>
  </div>
{/snippet}

<!-- Phones: the results span the screen; wider: they hang from the field. -->
{#snippet searchResults()}
  {#if open}
    <SearchOverlay
      hits={shownHits}
      total={hits.length}
      {activeIndex}
      {query}
      onloadmore={showMore}
      onselect={choose}
    />
  {/if}
{/snippet}

<!-- Three columns: the equal-width sides keep the search centred and still
     while the actions on the right come and go. Positioned: on phones the
     drafts list spans this bar. Phones hide it while writing, leaving the
     screen to the entry; closing the editor brings it back. -->
<header
  class="relative z-bar grid h-14 shrink-0 {app.editing ? 'max-sm:hidden' : ''} grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate px-3 sm:grid-cols-[1fr_minmax(0,28rem)_1fr] sm:gap-4 sm:px-6"
>
  <!-- Brand -->
  <div class="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-text">
    <span class="grid h-6 w-6 place-items-center rounded-full border border-faint">
      <span class="h-1.5 w-1.5 rounded-full bg-muted"></span>
    </span>
    <span class="hidden sm:inline">Icarus</span>
  </div>

  <!-- Centered search (on phones it unfolds from an icon, below) -->
  <div class="min-w-0">
    {#if !viewport.compact}
      <div class="relative w-full">
        {@render searchField()}
        {@render searchResults()}
      </div>
    {/if}
  </div>

  <div class="flex items-center justify-end gap-1 sm:gap-4">
    <!-- Writing: saved drafts (only once there are any) and the "write" action.
         Hidden while the editor is open: it offers its own drafts menu. -->
    <!-- Search (phones) -->
    {#if viewport.compact}
      <button
        bind:this={searchButtonEl}
        class="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
        aria-label="Search"
        aria-expanded={searchExpanded}
        onclick={expandSearch}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
    {/if}

    {#if !app.editing}
      {#if app.drafts.length > 0}
        <DraftsMenu compact />
      {/if}
      <WriteButton variant="header" />
    {/if}

    <!-- Statistics -->
    <button
      class="grid h-10 w-10 shrink-0 place-items-center rounded-lg sm:h-8 sm:w-8 text-muted transition-colors hover:bg-slate hover:text-text"
      aria-label="Statistics"
      onclick={() => (app.statsOpen = true)}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/></svg>
    </button>

    <!-- Lock (encrypted diaries only) -->
    {#if app.encrypted}
      <button
        class="grid h-10 w-10 shrink-0 place-items-center rounded-lg sm:h-8 sm:w-8 text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-50"
        aria-label="Lock diary"
        title="Lock diary"
        onclick={() => app.lock()}
        disabled={app.busy}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      </button>
    {/if}

    <!-- Settings (a dot while an update waits) -->
    <button
      class="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg sm:h-8 sm:w-8 text-muted transition-colors hover:bg-slate hover:text-text"
      aria-label={updates.available ? 'Settings, update available' : 'Settings'}
      onclick={() => (app.settingsOpen = true)}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      {#if updates.available}
        <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#f5b452] ring-2 ring-ink sm:right-0.5 sm:top-0.5" aria-hidden="true"></span>
      {/if}
    </button>
  </div>

  <!-- Phones: the unfolded search, over the whole bar. -->
  {#if viewport.compact && searchExpanded}
    <div class="absolute inset-0 flex items-center gap-1 bg-ink pr-3 pl-1" in:reveal out:reveal>
      <button
        class="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
        aria-label="Close search"
        onmousedown={(e) => e.preventDefault()}
        onclick={collapseSearch}
        in:fly|global={{ x: 8, duration: 360, delay: 90, easing: quintOut }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
      <div class="min-w-0 flex-1" in:fly|global={{ x: 24, duration: 420, delay: 40, easing: quintOut }}>
        {@render searchField()}
      </div>
    </div>
  {/if}
  <!-- Outside the unfolding layer: its clip and offset would catch the
       results, and folding it would hold them on screen. -->
  {#if viewport.compact}
    {@render searchResults()}
  {/if}
</header>
