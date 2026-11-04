<script lang="ts">
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { clickOutside, trapFocus } from '../lib/actions';
  import { keyToDate, longDayLabel } from '../lib/date';
  import { truncateText } from '../lib/text';

  // The list hangs below the trigger, from its right edge (the trigger sits at
  // the right of the top bar and of the editor header).
  let {
    compact = false,
  }: {
    /** Hide the "Drafts" label on narrow screens, leaving the icon. */
    compact?: boolean;
  } = $props();

  let open = $state(false);

  // Newest first.
  const sorted = $derived(
    [...app.drafts].sort((a, b) => b.updatedAt - a.updatedAt),
  );

  const preview = (text: string) => truncateText(text, 80);

  async function choose(id: string) {
    await app.openDraft(id);
    open = false;
  }

  function askDelete(id: string) {
    // Close the list first — its scrollbar would otherwise bleed over the modal.
    open = false;
    app.requestDeleteDraft(id);
  }
</script>

<div class="relative">
  <button
    class="flex items-center gap-1.5 rounded-lg border border-slate px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text"
    onclick={() => (open = !open)}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-label="Drafts"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1V18c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"/><path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5H15"/><path d="M15 2v5h5"/></svg>
    <span class={compact ? 'hidden sm:inline' : ''}>Drafts</span>
    {#if app.drafts.length > 0}
      <span class="grid h-4 min-w-4 place-items-center rounded-full bg-slate px-1 text-[0.65rem] font-semibold tabular-nums text-text">
        {app.drafts.length}
      </span>
    {/if}
  </button>

  {#if open}
    <div
      class="absolute z-50 max-h-80 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate bg-surface p-1.5 shadow-2xl shadow-black/50
        right-0 top-full mt-2 origin-top-right"
      transition:scale={{ duration: 160, start: 0.95, easing: cubicOut }}
      use:clickOutside={() => (open = false)}
      use:trapFocus={() => (open = false)}
      role="dialog"
      aria-label="Saved drafts"
    >
      {#if sorted.length === 0}
        <p class="px-3 py-6 text-center text-sm text-muted">No drafts yet.</p>
      {:else}
        {#each sorted as draft (draft.id)}
          <div
            class="group flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-soft
              {draft.id === app.draftId ? 'bg-slate-soft ring-1 ring-inset ring-faint' : ''}"
          >
            <button
              class="min-w-0 flex-1 text-left"
              onclick={() => choose(draft.id)}
            >
              <p class="truncate text-sm font-medium text-text">
                {draft.title.trim() || 'Untitled'}
              </p>
              {#if draft.editingUid}
                <p class="text-[0.65rem] font-medium uppercase tracking-wide text-muted">
                  Entry edit
                </p>
              {/if}
              {#if preview(draft.content)}
                <p class="truncate text-xs text-muted">{preview(draft.content)}</p>
              {/if}
              <p class="mt-0.5 text-[0.7rem] text-muted">
                {longDayLabel(keyToDate(draft.dateKey), app.dateFormat)}
              </p>
            </button>
            <button
              class="shrink-0 rounded-md p-2 text-muted transition-all hover:bg-slate hover:text-red-400 focus-visible:opacity-100 sm:p-1 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
              aria-label="Delete draft"
              onclick={() => askDelete(draft.id)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
