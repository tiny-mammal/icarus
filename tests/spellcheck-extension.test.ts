// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Spellcheck, refreshSpellcheck } from '../src/lib/spellcheck-extension';
import { ensureSpellchecker } from '../src/lib/spellcheck';

let editor: Editor;
beforeAll(async () => { await ensureSpellchecker(); });
afterEach(() => { editor?.destroy(); });

function open(content: string) {
  editor = new Editor({ extensions: [StarterKit, Spellcheck], content });
  refreshSpellcheck(editor);
}

function flagged() {
  return [...editor.view.dom.querySelectorAll('.spell-misspelled')]
    .map((node) => node.textContent);
}

describe('spellcheck updates', () => {
  it('adds and removes underlines in the editing transaction', () => {
    open('<p>diary</p>');
    editor.view.dispatch(editor.state.tr.insertText('diery', 1, 6));
    expect(flagged()).toEqual(['diery']);
    editor.view.dispatch(editor.state.tr.insertText('diary', 1, 6));
    expect(flagged()).toEqual([]);
  });

  it('rechecks a word when its suffix is deleted', () => {
    open('<p>diaryx</p>');
    expect(flagged()).toEqual(['diaryx']);
    editor.view.dispatch(editor.state.tr.delete(6, 7));
    expect(flagged()).toEqual([]);
  });

  it('checks both halves of a split paragraph and their joined word', () => {
    open('<p>diary</p>');
    editor.view.dispatch(editor.state.tr.split(3));
    expect(flagged()).toEqual(['di', 'ary']);
    editor.view.dispatch(editor.state.tr.join(4));
    expect(flagged()).toEqual([]);
  });

  it('keeps other blocks aligned while changing a word', () => {
    open('<p>diary</p><blockquote><p>diery</p></blockquote>');
    editor.view.dispatch(editor.state.tr.insertText('hello ', 1));
    expect(flagged()).toEqual(['diery']);
    editor.view.dispatch(editor.state.tr.insertText('diary', 15, 20));
    expect(flagged()).toEqual([]);
  });

  it('updates both words when a space is inserted or deleted', () => {
    open('<p>diarydiary</p>');
    expect(flagged()).toEqual(['diarydiary']);
    editor.view.dispatch(editor.state.tr.insertText(' ', 6));
    expect(flagged()).toEqual([]);
    editor.view.dispatch(editor.state.tr.delete(6, 7));
    expect(flagged()).toEqual(['diarydiary']);
    editor.commands.undo();
    expect(flagged()).toEqual(['diarydiary']);
  });

  it('preserves other errors in the same paragraph', () => {
    open('<p>diery hello diery</p>');
    editor.view.dispatch(editor.state.tr.insertText('diary', 1, 6));
    expect(flagged()).toEqual(['diery']);
  });

  it('checks words across formatting and skips inline code', () => {
    open('<p>di<strong>ery</strong> <code>diery</code></p>');
    editor.view.dispatch(editor.state.tr.insertText('a', 3, 4));
    expect(flagged()).toEqual([]);
  });

  it('matches a full recheck through mixed edits across blocks', () => {
    open('<p>diery hello diary</p><p>world diery</p><p>another entry</p>');
    let seed = 471;
    const random = (max: number) => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % max;
    };
    const inserts = [' ', 'diery', 'diary', "'", '-', '', 'hello', '𐐀diery'];
    for (let i = 0; i < 100; i++) {
      const size = editor.state.doc.content.size;
      const from = 1 + random(Math.max(1, size - 1));
      const to = Math.min(size - 1, from + random(8));
      editor.view.dispatch(editor.state.tr.insertText(inserts[random(inserts.length)], from, to));
      const incremental = editor.view.dom.innerHTML;
      refreshSpellcheck(editor);
      expect(incremental, `edit ${i}`).toBe(editor.view.dom.innerHTML);
    }
  });

  it('removes underlines when prose becomes code', () => {
    open('<p>diery</p>');
    editor.commands.setCodeBlock();
    expect(flagged()).toEqual([]);
    editor.commands.setParagraph();
    expect(flagged()).toEqual(['diery']);
  });
});
