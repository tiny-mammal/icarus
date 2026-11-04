<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { spellCheck, verticalDrag } from '../lib/actions';
  import DraftsMenu from './DraftsMenu.svelte';
  import DatePicker from './DatePicker.svelte';
  import { dateKey } from '../lib/date';
  import { devError } from '../lib/log';

  // Tiptap/ProseMirror is the heaviest dependency and only shows once the dock
  // expands, so it lives in its own chunk. Fetching it as soon as the dock
  // mounts keeps it off the first paint yet ready before anyone can type.
  let RichEditor = $state<(typeof import('./RichEditor.svelte'))['default'] | null>(null);
  import('./RichEditor.svelte')
    .then((module) => (RichEditor = module.default))
    .catch((err) => devError('WritingDock: could not load the editor', err));

  let saving = $state(false);

  // Slide the fullscreen panel up from the bottom edge (translateY), rather
  // than svelte's `slide`, which animates height and grows from the top.
  function slideUp(_node: Element, { duration = 320 } = {}) {
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => `transform: translateY(${(1 - t) * 100}%)`,
    };
  }

  function askDiscard() {
    if (app.draftId) app.requestDeleteDraft(app.draftId);
  }

  // Is there anything worth saving / discarding right now?
  const hasContent = $derived(
    !!(
      app.draftTitle.trim() ||
      app.draftContent.trim() ||
      app.draftLocation.trim()
    ),
  );

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

  function expand() {
    app.dockExpanded = true;
  }
  function collapse() {
    app.collapseDock();
  }

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
    // Escape is handled globally (App.svelte) so it collapses the dock in the
    // same priority order as the other overlays.
  }
</script>

<div
  class={[
    'pointer-events-none fixed inset-x-0 bottom-0 flex justify-center',
    app.dockExpanded ? 'z-50' : 'z-30',
  ]}
>
  <div class="pointer-events-auto w-full">
    {#if app.dockExpanded}
      <!-- Keydown is delegated from the inputs within (Cmd+Enter / Escape). -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="fixed inset-0 z-50 flex h-screen w-full flex-col bg-surface"
        transition:slideUp={{ duration: 320 }}
        onkeydown={onKeydown}
        role="form"
        tabindex="-1"
      >
        <!-- Grab handle: drag down (or click) to collapse -->
        <button
          class="group flex w-full shrink-0 cursor-grab justify-center py-2 active:cursor-grabbing"
          aria-label="Collapse"
          onclick={collapse}
          use:verticalDrag={{ onResolve: (d) => d === 'down' && collapse() }}
        >
          <span class="h-1 w-10 rounded-full bg-faint transition-colors group-hover:bg-muted"></span>
        </button>

        <div class="mx-auto flex w-full min-h-0 max-w-3xl flex-1 flex-col px-6 pb-6">
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
                    onclick={collapse}
                  >
                    Close
                  </button>
                  <span class="hidden text-xs text-muted sm:inline">
                    Changes autosave to drafts
                  </span>
                </div>
              {:else}
                <DraftsMenu align="left" />
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
                  class="rounded-lg border border-slate px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-50"
                  onclick={() => app.saveDraftAndReset()}
                  disabled={saving}
                >
                  Save as draft
                </button>
              {/if}
              <button
                class="flex items-center gap-2 rounded-lg bg-text px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
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
    {:else}
      <!-- Collapsed strip: expand to write, plus quick access to drafts -->
      <div
        class="mx-auto flex w-full items-center gap-2 border-t border-slate bg-surface px-6 py-3"
      >
        <button
          class="group flex flex-1 items-center gap-3 text-left"
          onclick={expand}
          use:verticalDrag={{ onResolve: (d) => d === 'up' && expand() }}
        >
          <span class="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors group-hover:text-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </span>
          <span class="text-sm text-muted transition-colors group-hover:text-text">
            {app.draftId || hasContent ? 'Continue your draft…' : "Write today's chapter…"}
          </span>
        </button>

        <DraftsMenu align="right" />
      </div>
    {/if}
  </div>
</div>
