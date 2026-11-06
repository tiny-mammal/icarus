<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { isEncryptedVault } from '../lib/crypto/vault';
  import ConfirmDialog from './ConfirmDialog.svelte';

  // Rendered at the app root so it also guards Welcome, where a saved diary
  // that failed to open must not be overwritten by accident.
  const count = $derived(app.entries.length);
  // An encrypted import erases the daily copies, which could reveal it.
  const keepsCopy = $derived(
    app.storageKind === 'device' && !!app.replaceRequest && !isEncryptedVault(app.replaceRequest.text),
  );
</script>

{#if app.replaceRequest}
  <ConfirmDialog
    title="Replace your diary?"
    confirmLabel={app.replaceRequest.source === 'new' ? 'Start over' : 'Replace diary'}
    onconfirm={() => app.confirmReplace()}
    oncancel={() => app.cancelReplace()}
    busy={app.busy}
  >
    {#if app.vault}
      Your diary with <span class="text-text">{count}</span> {count === 1 ? 'entry' : 'entries'}
    {:else}
      The diary saved {app.appPlaceIn}
    {/if}
    will be replaced{app.replaceRequest.source === 'new' ? ' by an empty one' : ' by the imported file'},
    and its drafts and personal dictionary erased.
    {#if keepsCopy}
      A copy from earlier today is kept, but export a backup first to keep your latest changes.
    {:else}
      Export a backup first if you may want it back. This can't be undone.
    {/if}
  </ConfirmDialog>
{/if}
