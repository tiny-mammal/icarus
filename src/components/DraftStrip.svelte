<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { keyToDate, nearDayLabel } from '../lib/date';
  import { previewText } from '../lib/text';

  /**
   * The minimized editor: while work in progress waits for the user to read
   * something else, this strip says it is still there and reopens it with one
   * tap. Docked at the bottom edge on phones (where it replaces the floating
   * write button), and in the bottom-right corner on wide screens.
   */

  const parked = $derived(app.parkedDraft);
  const heading = $derived(
    parked
      ? parked.title.trim() || previewText(parked.content, 60) || parked.location.trim() || 'Untitled'
      : '',
  );
</script>

{#if parked}
  <button
    class="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-float flex items-center gap-3 rounded-2xl border border-slate bg-surface py-2.5 pr-3 pl-2.5 text-left shadow-xl shadow-black/50 transition-colors hover:bg-slate-soft
      sm:right-5 sm:bottom-5 sm:left-auto sm:w-80"
    aria-label="Continue writing: {heading}"
    onclick={() => app.resumeParked()}
    transition:fly={{ y: 24, duration: 200, easing: cubicOut }}
  >
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-text text-ink">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1V18c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"/><path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5H15"/><path d="M15 2v5h5"/></svg>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-medium text-text">{heading}</span>
      <span class="block truncate text-xs text-muted">
        {parked.revision ? 'Editing entry' : 'Draft'} · {nearDayLabel(keyToDate(parked.dateKey), app.dateFormat)}
      </span>
    </span>
    <svg class="shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
  </button>
{/if}
