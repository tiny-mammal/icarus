<script lang="ts">
  import { app } from '../lib/store.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { t } from '../lib/i18n/index.svelte';

  // Rendered at the app root (outside the day pane) so its `fixed` overlay
  // covers the real viewport rather than the pane.
  const draft = $derived(
    app.confirmDeleteId
      ? (app.drafts.find((d) => d.id === app.confirmDeleteId) ?? null)
      : null,
  );
  // Same action either way; deleting the draft open in the editor discards it.
  const discarding = $derived(app.discardingOpenDraft);
</script>

{#if draft}
  <ConfirmDialog
    title={discarding ? t.editor.discardDraftTitle : t.editor.deleteDraftTitle}
    confirmLabel={discarding ? t.editor.discard : t.common.delete}
    message={t.editor.deleteDraftBody}
    subject={draft.title.trim() || t.common.untitled}
    onconfirm={() => app.confirmDeleteDraft()}
    oncancel={() => app.cancelDeleteDraft()}
  />
{/if}
