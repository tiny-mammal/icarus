<script lang="ts" module>
  /** Which field takes focus when the editor opens. */
  /**
   * Which field takes focus when the editor opens, and where its caret goes:
   * after the `at`-th visible character (as tapped in the reader), or the end.
   */
  export type EditorFocus = {
    field: 'title' | 'location' | 'body';
    at: number | 'end';
  } | null;
</script>

<script lang="ts">
  import BusyLabel from './BusyLabel.svelte';
  import { tooltip } from '../lib/tooltip';
  import { app } from '../lib/store.svelte';
  import { spellCheck } from '../lib/actions';
  import { dateKey } from '../lib/date';
  import { devError } from '../lib/log';
  import { loadRichEditor } from '../lib/editor-loader';
  import { indexAfterVisible } from '../lib/caret';
  import { formatLength } from '../lib/text-count';
  import DraftsMenu from './DraftsMenu.svelte';
  import DatePicker from './DatePicker.svelte';
  import DayTracker from './DayTracker.svelte';
  import PaneSizeToggle from './PaneSizeToggle.svelte';

  /**
   * The day pane in writing mode: the entry being written or revised, laid
   * out like the reader (title, location, body) so switching between the two
   * feels like the text simply became editable. Work autosaves to drafts, and
   * says so, so closing is how to park it; "Save" commits it to the diary.
   */
  let { focus = null }: { focus?: EditorFocus } = $props();

  let RichEditor = $state<(typeof import('./RichEditor.svelte'))['default'] | null>(null);
  loadRichEditor()
    .then((module) => (RichEditor = module.default))
    .catch((err) => devError('EntryEditor: could not load the editor', err));

  let body = $state<{ undo(): void; redo(): void }>();
  let canUndo = $state(false);
  let canRedo = $state(false);

  let saving = $state(false);
  let titleEl = $state<HTMLInputElement | null>(null);
  let locationEl = $state<HTMLInputElement | null>(null);

  // Applied once, when the editor opens; the pane mounts it per session.
  // svelte-ignore state_referenced_locally
  const initial = focus;
  const bodyFocus = initial?.field === 'body' ? initial.at : null;
  $effect(() => {
    const input = initial?.field === 'title' ? titleEl : initial?.field === 'location' ? locationEl : null;
    if (!input || !initial) return;
    input.focus();
    const end = input.value.length;
    const at = initial.at === 'end' ? end : (indexAfterVisible(input.value, initial.at) ?? end);
    input.setSelectionRange(at, at);
  });

  // Entries written for another day shouldn't be invited as "today's" chapter.
  const bodyPlaceholder = $derived(
    app.draftDateKey === dateKey(new Date())
      ? "Write today's chapter… Markdown is welcome."
      : 'Write this day’s chapter… Markdown is welcome.',
  );

  const countLabel = $derived(formatLength(app.draftContent, app.lengthCount));

  // Unless the user prefers it always visible, the count steps aside while
  // the body changes, so it never ticks along with every letter, and returns
  // after a pause (or on hover). Keyed on the content rather than input
  // events: ProseMirror handles Enter, Backspace and undo itself, without a
  // native input event.
  const TYPING_PAUSE_MS = 1500;
  let typing = $state(false);
  let lastContent = app.draftContent;
  $effect(() => {
    if (app.draftContent === lastContent) return;
    lastContent = app.draftContent;
    if (!app.countHidesWhileTyping) return;
    typing = true;
    const timer = setTimeout(() => (typing = false), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  });
  $effect(() => {
    if (!app.countHidesWhileTyping) typing = false;
  });

  // Autosave: whenever a field changes, schedule a debounced write to the
  // persisted draft store, so an unsaved entry survives a crash, a power cut,
  // or quitting the app mid-sentence.
  $effect(() => {
    void app.draftTitle;
    void app.draftLocation;
    void app.draftContent;
    void app.draftDateKey;
    app.scheduleDraftSave();
  });

  async function commit() {
    saving = true;
    await app.commit();
    saving = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void commit();
    }
    // Escape is handled globally (App.svelte): it goes back to reading.
  }
</script>

<!--
  Undo / redo for the body (title and location keep their native undo).
  Pressing doesn't take focus, so the caret and the phone keyboard stay put.
-->
{#snippet historyButton(label: string, keys: string[], enabled: boolean, run: () => void, path: string)}
  <button
    class="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted sm:h-8 sm:w-8"
    aria-label={label}
    use:tooltip={{ label, keys }}
    disabled={!enabled}
    onmousedown={(e) => e.preventDefault()}
    onclick={run}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={path}/></svg>
  </button>
{/snippet}

<!-- Keydown is delegated from the fields within (Cmd/Ctrl+Enter). -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="flex min-h-0 flex-1 flex-col"
  onkeydown={onKeydown}
  role="form"
  aria-label={app.editingUid ? 'Edit entry' : 'New entry'}
>
  <!-- Positioned: on phones the drafts list spans this bar. -->
  <header
    class="relative flex items-center justify-between gap-2 border-b border-slate py-3 pr-2 pl-4 sm:gap-3 sm:py-5 sm:pr-[var(--pane-gutter)] sm:pl-[calc(var(--pane-gutter)-0.25rem)]"
  >
    <div class="flex min-w-0 items-center gap-3">
      <DatePicker bind:value={app.draftDateKey} align="left" />
      <!-- The day being written about: its score and habits, without leaving the text. -->
      <DayTracker dayKey={app.draftDateKey} writing />
    </div>
    <div class="flex shrink-0 items-center gap-1">
      {#if !app.editingUid && app.drafts.length > 0}
        <DraftsMenu compact />
      {/if}
      <!-- Only once there is history, so a fresh entry keeps a quiet header. -->
      {#if canUndo || canRedo}
        {@render historyButton('Undo', ['⌘/Ctrl', 'Z'], canUndo, () => body?.undo(), 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11')}
        {@render historyButton('Redo', ['⌘/Ctrl', '⇧', 'Z'], canRedo, () => body?.redo(), 'm15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13')}
      {/if}
      <PaneSizeToggle />
      <!-- Minimize when leaving keeps work waiting in the strip; else just close. -->
      <button
        class="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text sm:h-8 sm:w-8"
        aria-label={app.editorHasChanges ? 'Minimize' : 'Close'}
        use:tooltip={{
          label: app.editorHasChanges ? 'Minimize — keep writing later from the strip' : 'Close',
          keys: ['Esc'],
        }}
        onclick={() => app.closeEditor()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {#if app.editorHasChanges}<path d="m6 9 6 6 6-6"/>{:else}<path d="M18 6 6 18M6 6l12 12"/>{/if}
        </svg>
      </button>
    </div>
  </header>

  <!--
    Same paddings and type as the reader, so text stays where it was. Like the
    reader, title and subtitle scroll away with the body instead of staying
    pinned, which matters on phones once the keyboard takes half the screen.
  -->
  <div
    class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-5 [scroll-padding-block:2rem] sm:px-[var(--pane-gutter)] sm:pt-6"
  >
    <input
      bind:this={titleEl}
      class="w-full bg-transparent text-xl font-semibold tracking-tight text-text placeholder:text-muted focus:outline-none"
      placeholder="Title"
      bind:value={app.draftTitle}
      use:spellCheck={app.spellcheck}
    />
    <input
      bind:this={locationEl}
      class="mt-1 w-full bg-transparent text-sm text-muted placeholder:text-muted/70 focus:outline-none"
      placeholder="Add a location or subtitle"
      bind:value={app.draftLocation}
      use:spellCheck={app.spellcheck}
    />

    {#if RichEditor}
      <RichEditor
        class="mt-4 w-full flex-1 cursor-text pb-8"
        placeholder={bodyPlaceholder}
        focusAt={bodyFocus}
        bind:this={body}
        bind:canUndo
        bind:canRedo
        bind:value={app.draftContent}
      />
    {:else}
      <!-- Same footprint while the editor chunk loads, so nothing jumps. -->
      <div class="mt-4 w-full flex-1"></div>
    {/if}
  </div>

  <footer
    class="flex items-center justify-between gap-3 border-t border-slate px-4 max-[359px]:gap-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-[var(--pane-gutter)]"
  >
    <!--
      Autosave made visible, so closing feels as safe as it is ("draft", so it
      isn't mistaken for the entry being saved); then the body's length,
      counted like the statistics, showing what the user chose, hidden while
      typing unless they prefer it always visible. It fades out quickly
      and back in slowly, so its return goes unnoticed.
    -->
    <p class="group min-w-0 truncate text-xs text-muted tabular-nums" data-testid="entry-status">
      {#if app.draftSaved}
        <span class="text-text/70">✓ <span class="max-[359px]:hidden">Draft saved</span><span class="min-[360px]:hidden">Saved</span></span>
      {/if}{#if countLabel}<span
          class="transition-opacity group-hover:opacity-100 group-hover:duration-150 {typing
            ? 'opacity-0 duration-150'
            : 'duration-700'}"
          data-testid="entry-count"
          >{#if app.draftSaved}<span aria-hidden="true">{' · '}</span>{/if}{countLabel}</span
        >{/if}
    </p>

    <button
      class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-text px-4 py-2 max-[359px]:px-3 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      aria-label="Save entry"
      onclick={commit}
      disabled={saving}
    >
      <span><BusyLabel busy={saving}>{saving ? 'Saving' : 'Save'}</BusyLabel></span>
      <span class="hidden items-center gap-1 text-ink/60 sm:flex">
        <kbd class="font-mono text-xs">⌘/Ctrl</kbd>
        <kbd class="font-mono text-xs">↵</kbd>
      </span>
    </button>
  </footer>
</div>
