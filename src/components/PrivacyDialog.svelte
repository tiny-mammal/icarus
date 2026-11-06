<script lang="ts">
  import Modal from './Modal.svelte';
  import NewPasswordFields from './NewPasswordFields.svelte';
  import PasswordField from './PasswordField.svelte';
  import RecoveryKeyPanel from './RecoveryKeyPanel.svelte';
  import { app, type SecretResult } from '../lib/store.svelte';

  /**
   * Password-gated management of an encrypted diary: change the password,
   * replace the recovery key, or remove encryption. Each starts by asking for
   * the current password, so an unattended unlocked window can't be used to
   * take over the diary.
   */
  const kind = $derived(app.privacyDialog);

  let current = $state('');
  let next = $state('');
  let nextValid = $state(false);
  let recoveryKey = $state('');
  let recoverySaved = $state(false);
  let error = $state('');
  let working = $state(false);

  const titles = {
    password: 'Change password',
    recovery: 'New recovery key',
    disable: 'Remove encryption',
  } as const;

  function close() {
    app.discardPendingKeys();
    app.privacyDialog = null;
  }

  function report(result: SecretResult): boolean {
    if (result === 'wrong-secret') error = 'That password is not correct.';
    return result === 'ok';
  }

  async function run(action: () => Promise<void>) {
    if (working) return;
    working = true;
    error = '';
    try {
      await action();
    } finally {
      working = false;
    }
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    void run(async () => {
      if (kind === 'password') {
        if (!nextValid) return;
        if (report(await app.changePassword(current, next))) {
          app.toast('success', 'Password changed.');
          close();
        }
      } else if (kind === 'recovery') {
        if (recoveryKey) {
          if (!recoverySaved) return;
          if (await app.confirmRecoveryKey()) {
            app.toast('success', 'Recovery key replaced. The old one no longer works.');
            close();
          }
          return;
        }
        const prepared = await app.prepareRecoveryKey(current);
        if (report(prepared.result)) recoveryKey = prepared.recoveryKey ?? '';
      } else if (kind === 'disable') {
        if (report(await app.disableEncryption(current))) {
          app.toast('success', 'Encryption removed.');
          close();
        }
      }
    });
  }

  const canSubmit = $derived.by(() => {
    if (kind === 'recovery' && recoveryKey) return recoverySaved;
    if (!current) return false;
    return kind === 'password' ? nextValid : true;
  });

  const submitLabel = $derived.by(() => {
    if (kind === 'password') return working ? 'Changing…' : 'Change password';
    if (kind === 'recovery') return recoveryKey ? 'Replace recovery key' : working ? 'Generating…' : 'Continue';
    return working ? 'Decrypting…' : 'Remove encryption';
  });
</script>

{#if kind}
  <Modal title={titles[kind]} onclose={close} locked={working}>
    <form class="space-y-4" onsubmit={submit}>
      {#if kind === 'recovery' && recoveryKey}
        <p class="text-sm leading-relaxed text-muted">
          Save this new key somewhere safe. Once you confirm, the previous recovery key stops working.
        </p>
        <RecoveryKeyPanel {recoveryKey} bind:confirmed={recoverySaved} />
      {:else}
        {#if kind === 'disable'}
          <p class="rounded-lg border border-amber-300/30 bg-amber-300/5 px-3 py-2.5 text-sm leading-relaxed text-amber-200/90">
            The diary, drafts and dictionary will be stored unencrypted. Anyone with access to
            {app.appPlace} will be able to read them.
          </p>
        {:else if kind === 'recovery'}
          <p class="text-sm leading-relaxed text-muted">
            Generate a new recovery key if the current one may have been seen by someone else.
          </p>
        {/if}
        <PasswordField label="Current password" bind:value={current} autofocus invalid={!!error} />
        {#if error}
          <p class="text-sm text-red-400" role="alert">{error}</p>
        {/if}
        {#if kind === 'password'}
          <NewPasswordFields bind:password={next} bind:valid={nextValid} />
        {/if}
      {/if}

      <div class="flex justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:bg-slate hover:text-text"
          onclick={close}
          disabled={working}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-40
            {kind === 'disable' ? 'btn-danger' : 'bg-text text-ink hover:bg-text/90'}"
          disabled={!canSubmit || working}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  </Modal>
{/if}
