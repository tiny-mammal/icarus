<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { SearchHit } from '../lib/search';
  import type { DiaryEntry } from '../lib/types';
  import { splitTerms, snippetAround } from '../lib/highlight';
  import { longDayLabel } from '../lib/date';
  import { app } from '../lib/store.svelte';
  import Highlight from './Highlight.svelte';

  let {
    hits,
    total,
    activeIndex,
    query,
    onloadmore,
    onselect,
  }: {
    hits: SearchHit[];
    total: number;
    activeIndex: number;
    query: string;
    onloadmore: () => void;
    onselect: (entry: DiaryEntry) => void;
  } = $props();

  const terms = $derived(splitTerms(query));
  let listEl = $state<HTMLUListElement | null>(null);

  /** Load another batch whenever the rendered list is still near its end. */
  function loadMoreIfNeeded() {
    if (!listEl || hits.length >= total) return;
    const remaining = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight;
    if (remaining < 80) onloadmore();
  }

  $effect(() => {
    void activeIndex;
    void hits.length;
    void total;
    requestAnimationFrame(() => {
      listEl
        ?.querySelector<HTMLElement>('[data-active="true"]')
        ?.scrollIntoView({ block: 'nearest' });
      // This also covers tall viewports where the first batch has no scrollbar
      // and therefore cannot emit a scroll event to request the next batch.
      loadMoreIfNeeded();
    });
  });
</script>

<div
  class="absolute left-1/2 top-full z-50 mt-2 w-full -translate-x-1/2 overflow-hidden rounded-xl border border-slate bg-surface shadow-2xl shadow-black/50"
  transition:fly={{ y: -6, duration: 150 }}
>
  {#if hits.length === 0}
    <div class="px-4 py-6 text-center text-sm text-muted">No matching entries</div>
  {:else}
    <ul
      bind:this={listEl}
      class="max-h-[60vh] overflow-y-auto py-1"
      onscroll={loadMoreIfNeeded}
    >
      {#each hits as hit, i (hit.entry.uid)}
        <li>
          <button
            class="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors
              {i === activeIndex ? 'bg-slate' : 'hover:bg-slate-soft'}"
            data-active={i === activeIndex}
            onmousedown={(e) => e.preventDefault()}
            onclick={() => onselect(hit.entry)}
          >
            <span class="flex items-start justify-between gap-3">
              <span class="line-clamp-2 min-w-0 break-words text-sm font-medium text-text [overflow-wrap:anywhere]">
                <Highlight text={snippetAround(hit.entry.title, terms, 36)} {terms} />
              </span>
              <span class="shrink-0 text-[0.7rem] text-muted">{longDayLabel(hit.entry.date, app.dateFormat)}</span>
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
