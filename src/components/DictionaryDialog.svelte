<script lang="ts">
  /**
   * The personal spell-check dictionary: every word the user taught the
   * checker, with a way to take one back and to add one by hand. Opened from
   * Settings, over it, so closing returns there.
   */
  import { tick } from 'svelte';
  import { app } from '../lib/store.svelte';
  import { parseUserWord } from '../lib/spellcheck';
  import { tooltip } from '../lib/tooltip';
  import Modal from './Modal.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let draft = $state('');
  let error = $state('');
  let field = $state<HTMLInputElement>();
  let list = $state<HTMLUListElement>();

  const count = $derived(app.spellWords.length);

  async function add(e: SubmitEvent) {
    e.preventDefault();
    const word = parseUserWord(draft);
    if (!word) {
      error = 'Enter a single word: letters, apostrophes and hyphens only.';
      return;
    }
    if (app.spellWords.includes(word)) {
      error = `“${word}” is already in your dictionary.`;
      return;
    }
    app.addSpellWord(word);
    draft = '';
    error = '';
    // The list is sorted, so the new word may land out of sight.
    await tick();
    list?.querySelector(`[data-word="${CSS.escape(word)}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  /** Remove a word and keep keyboard focus where it was, instead of losing it with the row. */
  async function remove(word: string, index: number) {
    app.removeSpellWord(word);
    await tick();
    const buttons = list?.querySelectorAll('button');
    (buttons?.[Math.min(index, buttons.length - 1)] ?? field)?.focus();
  }
</script>

<Modal
  title="Personal dictionary"
  subtitle={count ? `${count} ${count === 1 ? 'word' : 'words'}` : undefined}
  {onclose}
  backLabel="Back to Settings"
  width="sm:max-w-md"
  z="z-dialog"
>
  <p class="text-xs leading-relaxed text-muted">
    Spell check never underlines these words.{app.encrypted ? ' They are encrypted with your diary.' : ''}
  </p>

  <form class="mt-4 flex gap-2" onsubmit={add} novalidate>
    <input
      bind:this={field}
      bind:value={draft}
      oninput={() => (error = '')}
      type="text"
      aria-label="Add a word"
      aria-invalid={error !== ''}
      aria-describedby={error ? 'dictionary-error' : undefined}
      placeholder="Add a word"
      maxlength="64"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      enterkeyhint="done"
      class="min-w-0 flex-1 rounded-lg border bg-slate-soft px-3 py-2 text-sm text-text transition-colors placeholder:text-muted focus:border-faint focus:outline-none {error
        ? 'border-red-400/60'
        : 'border-slate'}"
    />
    <button
      type="submit"
      disabled={!draft.trim()}
      class="shrink-0 rounded-lg bg-text px-4 py-2 text-sm font-semibold text-ink transition-opacity disabled:opacity-40"
    >
      Add
    </button>
  </form>
  {#if error}
    <p id="dictionary-error" class="mt-1.5 text-xs text-red-400" role="alert">{error}</p>
  {/if}

  {#if count}
    <ul
      bind:this={list}
      class="mt-4 divide-y divide-slate overflow-hidden rounded-xl border border-slate bg-slate-soft/50"
      aria-label="Words in your dictionary"
    >
      {#each app.spellWords as word, index (word)}
        <li class="flex min-h-11 items-center gap-2 py-1 pl-3.5 pr-1.5" data-word={word}>
          <span class="min-w-0 flex-1 break-words text-sm text-text">{word}</span>
          <button
            type="button"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-slate hover:text-text"
            aria-label="Remove {word}"
            use:tooltip={'Remove'}
            onclick={() => remove(word, index)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="mt-4 rounded-xl border border-dashed border-slate px-4 py-6 text-center text-xs leading-relaxed text-muted">
      No words yet. Choose “Add to dictionary” on an underlined word while writing, or type one above.
    </p>
  {/if}
</Modal>
