<script lang="ts">
  import { app } from '../lib/store.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { t } from '../lib/i18n/index.svelte';

  // Rendered at the app root (outside the day pane) so its `fixed` overlay
  // covers the real viewport rather than a transformed ancestor.
  const entry = $derived(
    app.confirmDeleteUid
      ? (app.entries.find((e) => e.uid === app.confirmDeleteUid) ?? null)
      : null,
  );
</script>

{#if entry}
  <ConfirmDialog
    title={t.editor.deleteEntryTitle}
    confirmLabel={t.common.delete}
    message={app.storageKind === 'device' ? t.editor.deleteEntryBodyDevice : t.editor.deleteEntryBodyBrowser}
    subject={entry.title.trim() || t.common.untitled}
    onconfirm={() => app.confirmDeleteEntry()}
    oncancel={() => app.cancelDeleteEntry()}
  />
{/if}
