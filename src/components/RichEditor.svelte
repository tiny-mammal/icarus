<script lang="ts">
  /**
   * A Notion-style WYSIWYG editor. The source of truth is still Markdown (so it
   * round-trips cleanly to the `.ics` DESCRIPTION), but the user never sees the
   * raw syntax: typing `# `, `**bold**`, `- `, `> `, etc. formats live as you
   * type. TipTap (ProseMirror) does the editing; `tiptap-markdown` parses the
   * incoming Markdown and serialises it back out on every change.
   *
   * Spell check is our own (see `spellcheck.ts`), so it looks the same on every
   * platform: the native one is disabled here and `Spellcheck` paints the
   * underlines instead.
   */
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Placeholder from '@tiptap/extension-placeholder';
  import ListKeymap from '@tiptap/extension-list-keymap';
  import { Markdown } from 'tiptap-markdown';
  import { app } from '../lib/store.svelte';
  import { ensureSpellchecker, ignoreWord, matchCase, suggest } from '../lib/spellcheck';
  import {
    Spellcheck,
    refreshSpellcheck,
    type SpellHit,
  } from '../lib/spellcheck-extension';
  import SpellMenu from './SpellMenu.svelte';
  import { countVisible, indexAfterVisible } from '../lib/caret';

  let {
    value = $bindable(''),
    placeholder = '',
    class: className = '',
    focusAt = null,
  }: {
    value?: string;
    placeholder?: string;
    class?: string;
    /**
     * Where to put the caret once the editor is up: after the n-th visible
     * character (where the user tapped while reading, see `caret.ts`), at the
     * end of the text, or nowhere.
     */
    focusAt?: number | 'end' | null;
  } = $props();

  let editor = $state<Editor>();
  let menu = $state<{ hit: SpellHit; suggestions: string[] } | null>(null);

  // The Markdown the editor currently represents. Used to tell our own changes
  // (typing) apart from external ones (opening a draft, reset after commit) so
  // we never feed the editor back its own output — which would jump the cursor.
  let lastValue = value;

  /** Document position right after the n-th visible character, if it exists. */
  function positionAfterVisible(current: Editor, n: number): number | null {
    let remaining = n;
    let found: number | null = null;
    current.state.doc.descendants((node, pos) => {
      if (found !== null) return false;
      if (!node.isText || !node.text) return true;
      const count = countVisible(node.text);
      if (count >= remaining) {
        found = pos + (indexAfterVisible(node.text, remaining) ?? 0);
      } else {
        remaining -= count;
      }
      return false;
    });
    return found;
  }

  function openMenu(hit: SpellHit) {
    menu = { hit, suggestions: suggest(hit.word) };
  }

  function editorHost(node: HTMLElement) {
    editor = new Editor({
      element: node,
      content: value,
      extensions: [
        StarterKit,
        Markdown.configure({
          html: false,
          tightLists: true,
          bulletListMarker: '-',
          linkify: true,
          breaks: true,
          transformPastedText: true,
        }),
        Placeholder.configure({ placeholder }),
        // Smart list editing: Backspace on an empty item lifts it back out to a
        // normal paragraph (natural position) instead of just dropping the marker.
        ListKeymap,
        Spellcheck.configure({
          enabled: () => app.spellcheck,
          onHit: openMenu,
        }),
      ],
      editorProps: {
        attributes: {
          class: 'markdown min-h-full focus:outline-none',
          // Native checking stays off: ours is the only underline.
          spellcheck: 'false',
          lang: 'en',
        },
      },
      onUpdate: ({ editor }) => {
        lastValue = editor.storage.markdown.getMarkdown();
        value = lastValue;
      },
    });

    const initialFocus = focusAt;
    if (initialFocus) {
      requestAnimationFrame(() => {
        if (!editor) return;
        const pos = initialFocus === 'end' ? null : positionAfterVisible(editor, initialFocus);
        editor.commands.focus(pos ?? 'end', { scrollIntoView: true });
      });
    }

    return {
      destroy() {
        editor?.destroy();
        editor = undefined;
      },
    };
  }

  // Push external value changes into the editor (draft opened, editor reset),
  // but skip our own edits — `lastValue` already matches those.
  $effect(() => {
    const incoming = value;
    if (!editor || incoming === lastValue) return;
    lastValue = incoming;
    editor.commands.setContent(incoming, false);
  });

  // Load the dictionary on demand and (re)paint the underlines when it arrives
  // or the preference flips. Nothing is underlined before it loads.
  $effect(() => {
    const enabled = app.spellcheck;
    const current = editor;
    if (!current) return;

    let cancelled = false;
    if (enabled) {
      void ensureSpellchecker().then(() => {
        if (!cancelled && editor) refreshSpellcheck(editor);
      });
    } else {
      refreshSpellcheck(current);
    }
    return () => {
      cancelled = true;
    };
  });

  /** Replace the flagged word with a suggestion, keeping its capitalisation. */
  function pick(suggestion: string) {
    if (!menu || !editor) return;
    const { from, to, word } = menu.hit;
    editor.view.dispatch(
      editor.state.tr.insertText(matchCase(word, suggestion), from, to),
    );
    closeMenu();
  }

  function addToDictionary() {
    if (!menu) return;
    app.addSpellWord(menu.hit.word);
    if (editor) refreshSpellcheck(editor);
    closeMenu();
  }

  function ignore() {
    if (!menu) return;
    ignoreWord(menu.hit.word);
    if (editor) refreshSpellcheck(editor);
    closeMenu();
  }

  function closeMenu() {
    menu = null;
    editor?.view.focus();
  }
</script>

<div use:editorHost class={className}></div>

{#if menu}
  <SpellMenu
    x={menu.hit.x}
    y={menu.hit.y}
    word={menu.hit.word}
    suggestions={menu.suggestions}
    onPick={pick}
    onAdd={addToDictionary}
    onIgnore={ignore}
    onClose={closeMenu}
  />
{/if}
