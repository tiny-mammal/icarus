<script lang="ts">
  import { tooltip } from '../lib/tooltip';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { keyToDate } from '../lib/date';
  import { isPlainShortcut } from '../lib/keyboard';
  import { swipe } from '../lib/gestures';
  import { queryTerms, countMatches } from '../lib/highlight';
  import { loadRichEditor } from '../lib/editor-loader';
  import { devError } from '../lib/log';
  import { visibleOffsetAt } from '../lib/caret';
  import type { DiaryEntry } from '../lib/types';
  import MarkdownView from './MarkdownView.svelte';
  import Highlight from './Highlight.svelte';
  import DayStepper from './DayStepper.svelte';
  import EntryPager from './EntryPager.svelte';
  import PaneSizeToggle from './PaneSizeToggle.svelte';
  import ScrollTopButton from './ScrollTopButton.svelte';
  import EntryEditor, { type EditorFocus } from './EntryEditor.svelte';

  /**
   * The one place where a day is read and written. It slides over the
   * calendar (filling the screen on phones) and shows either the day's entries
   * or, while `app.editing`, the editor for the entry being written or revised.
   */

  const dayDate = $derived(app.selectedKey ? keyToDate(app.selectedKey) : null);

  // Fetch the editor chunk as soon as a day opens, so writing starts instantly.
  $effect(() => {
    if (app.selectedKey) {
      loadRichEditor().catch((err) => devError('DayPane: could not prefetch the editor', err));
    }
  });

  // One entry per page when a day holds several. `page` is kept in range as the
  // selection changes; it resets to the first entry whenever the day changes.
  let page = $state(0);
  const count = $derived(app.selectedEntries.length);
  const safePage = $derived(Math.min(page, Math.max(0, count - 1)));
  const entry = $derived(app.selectedEntries[safePage] ?? null);

  // Terms to highlight when this day was opened from a search hit.
  const terms = $derived(queryTerms(app.searchHighlight));
  // Match count reported by the rendered Markdown body (title/location added).
  let contentMatches = $state(0);
  const matchCount = $derived(
    (entry ? countMatches(entry.title, terms) : 0) +
      (entry?.location ? countMatches(entry.location, terms) : 0) +
      contentMatches,
  );
  const headingMatches = $derived(
    entry
      ? countMatches(entry.title, terms) +
          (entry.location ? countMatches(entry.location, terms) : 0)
      : 0,
  );

  // On day change, jump to the searched entry (if any) rather than the first.
  $effect(() => {
    app.selectedKey; // re-run on day change
    const uid = app.focusEntryUid;
    const idx = uid ? app.selectedEntries.findIndex((e) => e.uid === uid) : -1;
    page = idx >= 0 ? idx : 0;
  });

  // Scroll the first highlighted hit in the body into view once it's rendered.
  function onBodyHighlight(c: number, first: HTMLElement | null) {
    contentMatches = c;
    // The title and location come before the body. If either matched, keep the
    // reader at the top so the earliest highlighted result remains visible.
    if (first && headingMatches === 0) {
      requestAnimationFrame(() =>
        first.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }),
      );
    }
  }

  // --- reading → writing ----------------------------------------------------
  // Where the editor should put the caret when it opens.
  let editorFocus = $state<EditorFocus>(null);
  let reader = $state<HTMLElement | null>(null);
  // A focus request belongs to one editing session only.
  $effect(() => {
    if (!app.editing) editorFocus = null;
  });

  function writeHere() {
    if (!app.selectedKey) return;
    editorFocus = { field: 'title', at: 'end' };
    void app.newEntryOn(app.selectedKey);
  }

  function edit(target: DiaryEntry, focus: EditorFocus) {
    editorFocus = focus;
    void app.editEntry(target);
  }

  // Tapping the text being read turns it into the editor, with the caret on
  // the character that was tapped. Links still open, and finishing a text
  // selection doesn't count as a tap.
  function editAtTap(e: MouseEvent) {
    if (!entry) return;
    const target = e.target as Element;
    if (target.closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    const fieldEl = target.closest<HTMLElement>('[data-field]');
    const field = (fieldEl?.dataset.field ?? 'body') as 'title' | 'location' | 'body';
    const at = fieldEl ? visibleOffsetAt(fieldEl, e.clientX, e.clientY) : null;
    edit(entry, { field, at: at ?? 'end' });
  }

  // Touch: swipe sideways to step to the previous/next day with entries, the
  // same move as ←/→ on a keyboard. Off while writing.
  const daySwipe = $derived({
    onswipe: (dir: -1 | 1) => app.stepDay(dir),
    enabled: !app.overlayOpen,
  });

  // Reader shortcuts: ←/→ step between days with entries, Shift+←/→ between
  // the entries of the open day, N writes a new entry on the open day, E edits
  // the one being read, F toggles full screen. Inert while writing or another
  // overlay is up.
  function onKeydown(e: KeyboardEvent) {
    if (!app.selectedKey || app.overlayOpen || !isPlainShortcut(e)) return;
    if ((e.key === 'n' || e.key === 'N') && !e.shiftKey) {
      e.preventDefault();
      writeHere();
      return;
    }
    if ((e.key === 'f' || e.key === 'F') && !e.shiftKey) {
      e.preventDefault();
      app.paneExpanded = !app.paneExpanded;
      return;
    }
    if ((e.key === 'e' || e.key === 'E') && !e.shiftKey && entry) {
      e.preventDefault();
      edit(entry, { field: 'body', at: 'end' });
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (e.shiftKey) page = Math.min(Math.max(safePage + dir, 0), Math.max(0, count - 1));
    else app.stepDay(dir);
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if app.selectedKey && dayDate}
  <!-- Backdrop -->
  <div
    class="absolute inset-0 z-pane bg-ink/50 backdrop-blur-[1px]"
    transition:fade={{ duration: 180 }}
    onclick={() => app.closeDay()}
    role="presentation"
  ></div>

  <!--
    Sliding pane; it widens while writing to give the text room. Expanded, it
    fills the window and --pane-gutter centres the text in a readable column.
    Width and gutter animate together (the raw gutter is registered in app.css
    so it can), so the pane grows from its edge as the text glides to centre.
  -->
  <aside
    class="absolute right-0 top-0 z-pane flex h-full w-full flex-col border-l border-slate bg-surface shadow-2xl shadow-black/40 transition-[max-width,--pane-gutter-raw] duration-300 ease-glide motion-reduce:transition-none
      [--pane-gutter:max(1.75rem,var(--pane-gutter-raw))]
      {app.paneExpanded
        ? 'max-w-full border-l-0 [--pane-gutter-raw:calc((100%-46rem)/2)]'
        : `[--pane-gutter-raw:1.75rem] ${app.editing ? 'max-w-3xl' : 'max-w-xl'}`}"
    transition:fly={{ x: 480, duration: 320, easing: cubicOut }}
  >
    {#if app.editing}
      <EntryEditor focus={editorFocus} />
    {:else}
      <header class="flex items-center justify-between gap-2 border-b border-slate py-3 pr-2 pl-2 sm:gap-3 sm:py-5 sm:pr-[var(--pane-gutter)] sm:pl-[calc(var(--pane-gutter)-0.5rem)]">
        <div class="min-w-0">
          <DayStepper date={dayDate} />
          {#if terms.length}
            <p class="mt-1 pl-8 text-[0.7rem] font-medium text-muted">
              {#if matchCount > 0}
                <span class="text-text">{matchCount}</span>
                {matchCount === 1 ? 'match' : 'matches'} for “{app.searchHighlight}”
              {:else}
                No matches for “{app.searchHighlight}” here
              {/if}
            </p>
          {/if}
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button
            class="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text sm:h-8 sm:w-8"
            aria-label="New entry on this day"
            use:tooltip={{ label: 'New entry on this day', keys: ['N'] }}
            onclick={writeHere}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          {#if entry}
            <button
              class="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text sm:h-8 sm:w-8"
              aria-label="Edit entry"
              use:tooltip={{ label: 'Edit entry — or tap the text', keys: ['E'] }}
              onclick={() => entry && edit(entry, { field: 'body', at: 'end' })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button
              class="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-red-400 sm:h-8 sm:w-8"
              aria-label="Delete entry"
              use:tooltip={'Delete entry'}
              onclick={() => entry && app.requestDeleteEntry(entry.uid)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            </button>
          {/if}
          <PaneSizeToggle />
          <button
            class="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text sm:h-8 sm:w-8"
            aria-label="Close"
            use:tooltip={{ label: 'Close', keys: ['Esc'] }}
            onclick={() => app.closeDay()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </header>

      {#if count > 1}
        <div class="px-5 py-2.5 sm:px-[var(--pane-gutter)]">
          <EntryPager entries={app.selectedEntries} bind:page={() => safePage, (v) => (page = v)} />
        </div>
      {/if}

      <div
        bind:this={reader}
        class="min-h-0 flex-1 [touch-action:pan-y] overflow-y-auto overscroll-contain px-5 pt-5 {app.parkedDraft ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : 'pb-[calc(4rem+env(safe-area-inset-bottom))]'} [scroll-padding-block:2rem] sm:px-[var(--pane-gutter)] sm:pt-6"
        use:swipe={daySwipe}
      >
        {#if !entry}
          <div class="flex h-full flex-col items-center justify-center text-center text-muted">
            <p class="text-sm">No entries on this day yet.</p>
            <button
              class="mt-4 flex items-center gap-2 rounded-lg border border-slate px-3.5 py-2 text-sm text-text transition-colors hover:bg-slate"
              onclick={writeHere}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Write an entry for this day
            </button>
          </div>
        {:else}
          {#if app.hasPendingEdit(entry.uid)}
            <!-- The edit is kept apart until saved: say so, or it looks lost. -->
            <div
              class="mb-5 flex items-center justify-between gap-3 rounded-xl border border-slate bg-slate-soft py-2 pr-2 pl-3.5 text-sm text-muted"
              role="status"
            >
              <span class="min-w-0">Unsaved changes to this entry</span>
              <button
                class="shrink-0 rounded-lg px-2.5 py-1.5 font-medium text-text transition-colors hover:bg-slate"
                onclick={() => entry && edit(entry, { field: 'body', at: 'end' })}
              >
                Continue editing
              </button>
            </div>
          {/if}
          {#key entry.uid}
            <!-- Tapping the text starts editing it; the edit button and E do the same. -->
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
            <article class="min-h-full cursor-text" in:fade={{ duration: 150 }} onclick={editAtTap}>
              <h1 class="text-xl font-semibold tracking-tight text-text" data-field="title">
                <Highlight text={entry.title} {terms} />
              </h1>
              {#if entry.location}
                <p class="mt-1 text-sm text-muted" data-field="location">
                  <Highlight text={entry.location} {terms} />
                </p>
              {/if}
              {#if entry.content}
                <div class="mt-4" data-field="body">
                  <MarkdownView source={entry.content} {terms} onhighlight={onBodyHighlight} />
                </div>
              {/if}
            </article>
          {/key}
        {/if}
      </div>
      <ScrollTopButton target={reader} />
    {/if}
  </aside>
{/if}
