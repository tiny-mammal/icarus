<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { SearchHit } from '../lib/search';
  import type { DiaryEntry } from '../lib/types';
  import { queryTerms, snippetAround } from '../lib/highlight';
  import { longDayLabel } from '../lib/date';
  import { app } from '../lib/store.svelte';
  import Highlight from './Highlight.svelte';

  let {
    hits,
    total,
    activeIndex,
    query,
    oldestFirst,
    ontoggleorder,
    onloadmore,
    onselect,
  }: {
    hits: SearchHit[];
    total: number;
    activeIndex: number;
    query: string;
    oldestFirst: boolean;
    ontoggleorder: () => void;
    onloadmore: () => void;
    onselect: (entry: DiaryEntry) => void;
  } = $props();

  const terms = $derived(queryTerms(query));
  let listEl = $state<HTMLUListElement | null>(null);

  /**
   * Load another batch while the rendered list is within a screen of its end,
   * so a fling never runs out of rows.
   */
  function loadMoreIfNeeded() {
    if (!listEl || hits.length >= total) return;
    const remaining = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight;
    if (remaining < listEl.clientHeight) onloadmore();
  }

  // A new query or order starts at the top.
  $effect(() => {
    void query;
    void oldestFirst;
    if (listEl) listEl.scrollTop = 0;
  });

  // Keyboard navigation keeps the active row in view. Only on a change of
  // row: following the list's own growth would yank a scrolled list back up.
  $effect(() => {
    void activeIndex;
    requestAnimationFrame(() => {
      listEl
        ?.querySelector<HTMLElement>('[data-active="true"]')
        ?.scrollIntoView({ block: 'nearest' });
    });
  });

  // Also covers tall viewports where a batch has no scrollbar and therefore
  // cannot emit a scroll event to request the next one.
  $effect(() => {
    void hits.length;
    void total;
    requestAnimationFrame(loadMoreIfNeeded);
  });
</script>

<!-- Phones: spans the screen under the top bar; wider: hangs from the field. -->
<div
  class="fixed inset-x-3 top-14 z-popover mt-2 flex max-h-[min(60vh,calc(var(--screen-h)-6rem))] flex-col overflow-hidden rounded-xl border border-slate bg-surface shadow-2xl shadow-black/50 sm:absolute sm:inset-x-auto sm:left-1/2 sm:top-full sm:w-full sm:[transform:translateX(-50%)]"
  transition:fly={{ y: -6, duration: 150 }}
>
  {#if hits.length === 0}
    <div class="px-4 py-6 text-center text-sm text-muted">No matching entries</div>
  {:else}
    {#if total > 1}
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-slate py-1 pl-4 pr-1.5 text-[0.7rem] text-muted">
        <span>{total} results</span>
        <button
          class="flex h-8 items-center gap-1.5 rounded-md px-2.5 transition-colors hover:bg-slate hover:text-text sm:h-7"
          aria-label={oldestFirst ? 'Oldest first, show newest first' : 'Newest first, show oldest first'}
          onmousedown={(e) => e.preventDefault()}
          onclick={ontoggleorder}
        >
          <svg class="transition-transform {oldestFirst ? '[transform:rotate(180deg)]' : ''}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
          {oldestFirst ? 'Oldest first' : 'Newest first'}
        </button>
      </div>
    {/if}
    <ul
      bind:this={listEl}
      class="min-h-0 overflow-y-auto overscroll-contain py-1"
      onscroll={loadMoreIfNeeded}
    >
      {#each hits as hit, i (hit.entry.uid)}
        <li>
          <button
            class="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors sm:py-2.5
              {i === activeIndex ? 'bg-slate' : 'hover:bg-slate-soft'}"
            data-active={i === activeIndex}
            onmousedown={(e) => e.preventDefault()}
            onclick={() => onselect(hit.entry)}
          >
            <span class="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <span class="line-clamp-2 min-w-0 break-words text-sm font-medium text-text [overflow-wrap:anywhere]">
                <Highlight text={snippetAround(hit.entry.title, terms, 36)} {terms} />
              </span>
              <span class="shrink-0 text-[0.7rem] text-muted max-sm:order-first">{longDayLabel(hit.entry.date, app.dateFormat)}</span>
            </span>
            {#if hit.entry.location}
              <span class="line-clamp-2 break-words text-xs text-muted [overflow-wrap:anywhere]">
                <Highlight text={snippetAround(hit.entry.location, terms, 36)} {terms} />
              </span>
            {/if}
            {#if hit.entry.content}
              <span class="line-clamp-2 break-words text-xs text-muted [overflow-wrap:anywhere]">
                <Highlight text={snippetAround(hit.entry.content, terms, 36)} {terms} />
              </span>
            {/if}
          </button>
        </li>
      {/each}
      {#if hits.length < total}
        <li class="px-4 py-2 text-center text-[0.7rem] text-muted">
          Showing {hits.length} of {total} results
        </li>
      {/if}
    </ul>
  {/if}
</div>
