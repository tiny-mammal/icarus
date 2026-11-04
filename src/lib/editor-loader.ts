/**
 * Tiptap/ProseMirror is the heaviest dependency and only shows while writing,
 * so the rich editor lives in its own chunk. The day pane prefetches it as soon
 * as a day opens, so switching from reading to writing never waits on it.
 */
let pending: Promise<typeof import('../components/RichEditor.svelte')> | null = null;

export function loadRichEditor() {
  pending ??= import('../components/RichEditor.svelte').catch((err) => {
    pending = null; // let a later attempt retry
    throw err;
  });
  return pending;
}
