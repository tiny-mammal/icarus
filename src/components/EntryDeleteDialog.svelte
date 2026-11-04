<script lang="ts">
  import { app } from '../lib/store.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

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
    title="Delete entry?"
    confirmLabel="Delete"
    onconfirm={() => app.confirmDeleteEntry()}
    oncancel={() => app.cancelDeleteEntry()}
  >
    <span class="text-text">{entry.title.trim() || 'Untitled'}</span>
    will be permanently removed{app.vault?.kind === 'browser'
      ? ' from this browser'
      : app.vault
        ? ' from your vault'
        : ''}. This can't be undone.
  </ConfirmDialog>
{/if}
