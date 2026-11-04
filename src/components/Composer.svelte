<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { spellCheck } from '../lib/actions';
  import DraftsMenu from './DraftsMenu.svelte';
  import DatePicker from './DatePicker.svelte';
  import { dateKey } from '../lib/date';
  import { devError } from '../lib/log';

  // Tiptap/ProseMirror is the heaviest dependency and only shows once the
  // composer opens, so it lives in its own chunk. Fetching it as soon as the
  // composer mounts keeps it off the first paint yet ready before anyone types.
  let RichEditor = $state<(typeof import('./RichEditor.svelte'))['default'] | null>(null);
  import('./RichEditor.svelte')
    .then((module) => (RichEditor = module.default))
    .catch((err) => devError('Composer: could not load the editor', err));

  let saving = $state(false);

  function askDiscard() {
    if (app.draftId) app.requestDeleteDraft(app.draftId);
  }

  // Entries written for another day (e.g. from the day pane) shouldn't be
  // invited as "today's" chapter.
  const bodyPlaceholder = $derived(
    app.draftDateKey === dateKey(new Date())
      ? "Write today's chapter… Markdown is welcome."
      : 'Write this day’s chapter… Markdown is welcome.',
  );

  // Autosave: whenever the editor fields change, schedule a debounced write to
  // the persisted draft store. This is what makes an unsaved entry survive a
  // crash, a power cut, or quitting the app mid-sentence.
  $effect(() => {
    // Track every field so the effect re-runs on any edit.
    void app.draftTitle;
    void app.draftLocation;
    void app.draftContent;
    void app.draftDateKey;
    app.scheduleDraftSave();
  });

  function close() {
    app.closeComposer();
  }

  // Only a click that both starts and ends on the backdrop closes the composer,
  // so a text selection dragged past the card's edge doesn't dismiss it.
  let pressedBackdrop = false;

  async function commit() {
    saving = true;
    await app.commit();
    saving = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    // Escape is handled globally (App.svelte) so it closes the composer in the
    // same priority order as the other overlays.
  }
</script>

{#if app.composerOpen}
  <!-- Blurred backdrop; on phones the card fills the whole screen. -->
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-ink/70 backdrop-blur-sm sm:p-6"
    transition:fade={{ duration: 160 }}
    onpointerdown={(e) => (pressedBackdrop = e.target === e.currentTarget)}
    onclick={(e) => {
      if (pressedBackdrop && e.target === e.currentTarget) close();
      pressedBackdrop = false;
    }}
    role="presentation"
  >
    <!-- Keydown is delegated from the inputs within (Cmd+Enter / Escape). -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="flex h-full w-full flex-col bg-surface shadow-2xl shadow-black/50 sm:h-[min(85vh,56rem)] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-slate"
      transition:scale={{ duration: 200, start: 0.96, easing: cubicOut }}
      onkeydown={onKeydown}
      role="dialog"
      aria-modal="true"
      aria-label={app.editingUid ? 'Edit entry' : 'New entry'}
      tabindex="-1"
    >
      <div class="flex shrink-0 justify-end px-3 pt-3">
        <button
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
          aria-label="Close"
          title="Close (Esc)"
          onclick={close}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="flex min-h-0 w-full flex-1 flex-col px-6 pb-6 sm:px-10">
        <!-- Title -->
        <input
          class="w-full bg-transparent text-2xl font-semibold tracking-tight text-text placeholder:text-muted focus:outline-none"
          placeholder="Title"
          bind:value={app.draftTitle}
          use:spellCheck={app.spellcheck}
        />

        <!-- Location / subtitle + date -->
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate pb-3">
          <input
            class="min-w-0 flex-1 bg-transparent text-sm text-muted placeholder:text-muted focus:outline-none"
            placeholder="Add a location or subtitle"
            bind:value={app.draftLocation}
            use:spellCheck={app.spellcheck}
          />
          <DatePicker bind:value={app.draftDateKey} />
        </div>

        <!-- Body — Notion-style live Markdown formatting -->
        {#if RichEditor}
          <RichEditor
            class="mt-4 min-h-0 w-full flex-1 cursor-text overflow-y-auto pr-4"
            placeholder={bodyPlaceholder}
            bind:value={app.draftContent}
          />
        {:else}
          <!-- Same footprint while the editor chunk loads, so nothing jumps. -->
          <div class="mt-4 min-h-0 w-full flex-1 pr-4"></div>
        {/if}

        <!-- Actions -->
        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            {#if app.editingUid}
              <div class="flex items-center gap-2">
                <button
                  class="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-slate hover:text-text"
                  onclick={close}
                >
                  Close
                </button>
                <span class="hidden text-xs text-muted sm:inline">
                  Changes autosave to drafts
                </span>
              </div>
            {:else}
              <DraftsMenu align="left" compact />
              {#if app.draftOpened}
                <button
                  class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-red-400/10 hover:text-red-400"
                  onclick={askDiscard}
                >
                  Discard
                </button>
              {/if}
            {/if}
          </div>

          <div class="flex items-center gap-2">
            {#if !app.editingUid}
              <button
                class="whitespace-nowrap rounded-lg border border-slate px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-50"
                onclick={() => app.saveDraftAndReset()}
                disabled={saving}
              >
                Save as draft
              </button>
            {/if}
            <button
              class="flex items-center gap-2 whitespace-nowrap rounded-lg bg-text px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              onclick={commit}
              disabled={saving}
            >
              <span>{saving ? 'Saving…' : app.editingUid ? 'Save changes' : 'Commit entry'}</span>
              <span class="hidden items-center gap-1 text-ink/60 sm:flex">
                <kbd class="font-mono text-xs">⌘/Ctrl</kbd>
                <kbd class="font-mono text-xs">↵</kbd>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
