<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { isEncryptedVault } from '../lib/crypto/vault';
  import { fmt, t } from '../lib/i18n/index.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import Rich from './Rich.svelte';

  // Rendered at the app root so it also guards Welcome, where a saved diary
  // that failed to open must not be overwritten by accident.
  const count = $derived(app.entries.length);
  const device = app.storageKind === 'device';
  const fromNew = $derived(app.replaceRequest?.source === 'new');
  // An encrypted import erases the daily copies, which could reveal it.
  const keepsCopy = $derived(device && !!app.replaceRequest && !isEncryptedVault(app.replaceRequest.text));

  /** What will be replaced, and by what. */
  const consequence = $derived.by(() => {
    if (app.vault) {
      return fmt(fromNew ? t.app.replaceOpenWithEmpty : t.app.replaceOpenWithImport, { count });
    }
    if (device) return fromNew ? t.app.replaceSavedDeviceWithEmpty : t.app.replaceSavedDeviceWithImport;
    return fromNew ? t.app.replaceSavedBrowserWithEmpty : t.app.replaceSavedBrowserWithImport;
  });
</script>

{#if app.replaceRequest}
  <ConfirmDialog
    title={t.app.replaceTitle}
    confirmLabel={fromNew ? t.app.replaceStartOver : t.app.replaceConfirm}
    onconfirm={() => app.confirmReplace()}
    oncancel={() => app.cancelReplace()}
    busy={app.busy}
  >
    <Rich message={consequence} emphasisClass="text-text" />
    {keepsCopy ? t.app.replaceKeepsCopy : t.app.replaceExportFirst}
  </ConfirmDialog>
{/if}
