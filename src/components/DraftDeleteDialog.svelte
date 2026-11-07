<script lang="ts">
  import { app } from '../lib/store.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  // Rendered at the app root (outside the day pane) so its `fixed` overlay
  // covers the real viewport rather than the pane.
  const draft = $derived(
    app.confirmDeleteId
      ? (app.drafts.find((d) => d.id === app.confirmDeleteId) ?? null)
      : null,
  );
  // Same action either way; the editor's "Discard" button gets matching words.
  const verb = $derived(app.discardingOpenDraft ? 'Discard' : 'Delete');
</script>

{#if draft}
  <ConfirmDialog
    title="{verb} draft?"
    confirmLabel={verb}
    onconfirm={() => app.confirmDeleteDraft()}
    oncancel={() => app.cancelDeleteDraft()}
  >
    <span class="text-text">{draft.title.trim() || 'Untitled'}</span>
    will be permanently removed. This can't be undone.
  </ConfirmDialog>
{/if}
