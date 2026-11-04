<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import NewPasswordFields from './NewPasswordFields.svelte';
  import PasswordField from './PasswordField.svelte';
  import { app } from '../lib/store.svelte';
  import { vaultFileName } from '../lib/storage';

  /**
   * Shown instead of the diary while it is encrypted and locked: unlock with
   * the password, or with the recovery key plus a new password.
   */
  let mode = $state<'password' | 'recovery'>('password');
  let password = $state('');
  let recoveryKey = $state('');
  let newPassword = $state('');
  let newPasswordValid = $state(false);
  let error = $state('');
  let working = $state(false);
  let confirmForget = $state(false);

  const isDesktop = app.storageKind === 'tauri';
  const fileName = $derived(vaultFileName(app.lockedVault));
  const canSubmit = $derived(
    mode === 'password' ? password.length > 0 : recoveryKey.trim().length > 0 && newPasswordValid,
  );

  function switchMode(next: 'password' | 'recovery') {
    mode = next;
    error = '';
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!canSubmit || working) return;
    working = true;
    error = '';
    try {
      const result = mode === 'password'
        ? await app.unlock({ password })
        : await app.unlock({ recoveryKey }, newPassword);
      if (result === 'wrong-secret') {
        error = mode === 'password' ? 'That password is not correct.' : 'That recovery key is not correct.';
      }
    } finally {
      working = false;
    }
  }

  async function forget() {
    confirmForget = false;
    await app.forgetVault();
  }
</script>

<div class="vignette relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6">
  <div
    class="pointer-events-none absolute -top-40 h-[34rem] w-[34rem] rounded-full bg-slate/20 blur-3xl"
    in:fade={{ duration: 1200 }}
  ></div>

  <main class="relative flex w-full max-w-sm flex-col items-center" in:fly={{ y: 14, duration: 600, easing: cubicOut }}>
    <div class="mb-6 grid h-14 w-14 place-items-center rounded-full border border-faint text-muted">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
    </div>
    <h1 class="text-2xl font-semibold tracking-tight text-text">Diary locked</h1>
    <p class="mt-2 text-center text-sm text-muted">
      {#if fileName}<span class="font-mono text-text">{fileName}</span> is encrypted.{:else}This diary is encrypted.{/if}
    </p>

    {#if !app.encryptionSupported}
      <p class="mt-8 rounded-lg border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm text-amber-200/90">
        Unlocking needs a secure connection. Open Icarus over HTTPS (or on localhost), or use the
        desktop app.
      </p>
    {:else}
      <form class="mt-8 w-full space-y-4" onsubmit={submit}>
        {#if mode === 'password'}
          <PasswordField label="Password" bind:value={password} autofocus invalid={!!error} />
        {:else}
          <div>
            <label for="recovery-key" class="mb-1.5 block text-xs font-medium text-muted">Recovery key</label>
            <input
              id="recovery-key"
              bind:value={recoveryKey}
              autocomplete="off"
              spellcheck="false"
              autocapitalize="characters"
              placeholder="XXXX-XXXX-XXXX-…"
              aria-invalid={!!error}
              class="w-full rounded-lg border bg-slate-soft px-3 py-2 font-mono text-sm uppercase tracking-wide text-text placeholder:text-muted focus:border-faint focus:outline-none
                {error ? 'border-red-400/60' : 'border-slate'}"
            />
          </div>
          <NewPasswordFields bind:password={newPassword} bind:valid={newPasswordValid} />
        {/if}

        {#if error}
          <p class="text-sm text-red-400" role="alert">{error}</p>
        {/if}

        <button
          type="submit"
          class="w-full rounded-xl border border-faint bg-slate-soft px-6 py-3 text-sm font-medium text-text transition-colors hover:bg-slate disabled:opacity-40"
          disabled={!canSubmit || working}
        >
          {#if working}
            Unlocking…
          {:else}
            {mode === 'password' ? 'Unlock' : 'Unlock and set new password'}
          {/if}
        </button>
      </form>

      <button
        class="mt-5 text-xs text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
        onclick={() => switchMode(mode === 'password' ? 'recovery' : 'password')}
      >
        {mode === 'password' ? 'Forgot your password? Use the recovery key' : 'Use the password instead'}
      </button>
    {/if}

    <div class="mt-8 flex gap-4 text-xs text-muted">
      {#if isDesktop}
        <button class="underline-offset-4 transition-colors hover:text-text hover:underline" onclick={() => app.openVaultFolder()}>
          Open another folder
        </button>
      {:else}
        <button class="underline-offset-4 transition-colors hover:text-red-400 hover:underline" onclick={() => (confirmForget = true)}>
          Delete this diary
        </button>
      {/if}
    </div>
  </main>
</div>

{#if confirmForget}
  <ConfirmDialog
    title="Delete this diary?"
    confirmLabel="Delete diary"
    onconfirm={forget}
    oncancel={() => (confirmForget = false)}
    z="z-[65]"
  >
    The encrypted diary and its drafts will be permanently erased from this browser. Only do this
    if the password and recovery key are lost. This can't be undone.
  </ConfirmDialog>
{/if}
