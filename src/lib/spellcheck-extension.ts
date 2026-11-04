/**
 * TipTap extension behind the custom spell checker. It turns misspelled-word
 * ranges into ProseMirror decorations (view-only: the document is never
 * modified) and reports right-clicks on a flagged word so the UI can open a
 * suggestions menu.
 *
 * Edits re-check only the affected words in the same transaction, so
 * underlines update immediately without checking the whole document.
 */
import { Extension, type Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { docMisspellings, misspelledRanges, spellingWindow } from './spellcheck';

/** A right-click on a flagged word. */
export interface SpellHit {
  from: number;
  to: number;
  word: string;
  /** Viewport coordinates of the click. */
  x: number;
  y: number;
}

export interface SpellcheckOptions {
  /** Read live, so toggling the preference needs no editor rebuild. */
  enabled: () => boolean;
  /** Called when the user right-clicks a flagged word. */
  onHit: (hit: SpellHit) => void;
}

interface SpellcheckState {
  decorations: DecorationSet;
}

const spellcheckKey = new PluginKey<SpellcheckState>('icarusSpellcheck');
const REFRESH = 'icarus:spellcheck-refresh';

function buildDecorations(doc: PMNode): DecorationSet {
  const ranges = docMisspellings(doc).map(({ from, to }) =>
    Decoration.inline(from, to, { class: 'spell-misspelled' }),
  );
  return DecorationSet.create(doc, ranges);
}

export const Spellcheck = Extension.create<SpellcheckOptions>({
  name: 'icarusSpellcheck',

  addOptions() {
    return { enabled: () => true, onHit: () => {} };
  },

  addProseMirrorPlugins() {
    const { enabled, onHit } = this.options;

    return [
      new Plugin<SpellcheckState>({
        key: spellcheckKey,

        state: {
          init: () => ({ decorations: DecorationSet.empty }),

          apply(tr, prev, oldState) {
            if (tr.getMeta(spellcheckKey) === REFRESH) {
              return {
                decorations: enabled()
                  ? buildDecorations(tr.doc)
                  : DecorationSet.empty,
              };
            }
            if (!tr.docChanged) return prev;
            if (!enabled()) return { decorations: DecorationSet.empty };
            let decorations = prev.decorations.map(tr.mapping, tr.doc);
            const from = oldState.doc.content.findDiffStart(tr.doc.content);
            if (from === null) return { decorations };
            const end = oldState.doc.content.findDiffEnd(tr.doc.content);
            // A deletion can put the end before the start. Include both sides
            // of the boundary so splitting/joining words or blocks is checked.
            const to = Math.max(from, end?.b ?? from);
            tr.doc.nodesBetween(from, to, (node, pos) => {
              if (!node.isTextblock && !node.type.spec.code) return true;
              const window = node.type.spec.code
                ? { from: 0, to: node.content.size }
                : spellingWindow(
                    node,
                    Math.max(0, from - pos - 1),
                    Math.min(node.content.size, to - pos - 1),
                  );
              const start = pos + 1 + window.from;
              const end = pos + 1 + window.to;
              decorations = decorations.remove(
                decorations.find(start, end).filter(
                  (mark) => mark.from < end && mark.to > start,
                ),
              );
              if (!node.type.spec.code) {
                const block = node.cut(window.from, window.to);
                const marks = misspelledRanges(block, start).map(({ from, to }) =>
                  Decoration.inline(from, to, { class: 'spell-misspelled' }),
                );
                decorations = decorations.add(tr.doc, marks);
              }
              return false;
            });
            return { decorations };
          },
        },

        props: {
          decorations(state) {
            return (
              spellcheckKey.getState(state)?.decorations ?? DecorationSet.empty
            );
          },
        },
      }),

      new Plugin({
        props: {
          handleDOMEvents: {
            contextmenu(view, event) {
              if (!enabled()) return false;
              const at = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!at) return false;
              const decorations = spellcheckKey.getState(view.state)
                ?.decorations;
              const hit = decorations
                ?.find(Math.max(0, at.pos - 1), at.pos + 1)
                .find((d) => d.from <= at.pos && at.pos <= d.to);
              if (!hit) return false;

              const word = view.state.doc.textBetween(hit.from, hit.to);
              if (!word) return false;

              event.preventDefault();
              onHit({
                from: hit.from,
                to: hit.to,
                word,
                x: event.clientX,
                y: event.clientY,
              });
              return true;
            },
          },
        },
      }),
    ];
  },
});

/** Recompute (or clear, if disabled) the underlines right now. */
export function refreshSpellcheck(editor: Editor): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(spellcheckKey, REFRESH).setMeta('addToHistory', false),
  );
}
