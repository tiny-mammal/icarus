<script lang="ts">
  import { slide } from 'svelte/transition';
  import Modal from './Modal.svelte';
  import NewPasswordFields from './NewPasswordFields.svelte';
  import RecoveryKeyPanel from './RecoveryKeyPanel.svelte';
  import { app } from '../lib/store.svelte';

  /**
   * Password protection setup, in three contexts:
   *  - a brand-new diary or an import (`app.pendingDiary`): first choose
   *    whether to encrypt at all; nothing is written until that choice is
   *    made, so an encrypted diary never reaches the disk in plain text;
   *  - an existing diary, from Settings: straight to the password.
   * Then: password, recovery key, done.
   */
  type Step = 'choice' | 'password' | 'recovery' | 'done';

  // Captured once: the pending diary is consumed when it is saved.
  const source = app.pendingDiary?.source ?? 'settings';
  const onboarding = source !== 'settings';
  const isDesktop = app.storageKind === 'folder';
  const where = isDesktop ? 'this folder' : app.appPlace;

  let step = $state<Step>(onboarding ? 'choice' : 'password');
  let choice = $state<'encrypt' | 'plain'>(app.encryptionSupported ? 'encrypt' : 'plain');
  let password = $state('');
  let passwordValid = $state(false);
  let recoveryKey = $state('');
  let recoverySaved = $state(false);
  let working = $state(false);

  const titles: Record<Step, string> = {
    choice: source === 'import' ? 'Protect the imported diary?' : 'Protect your new diary?',
    password: onboarding ? 'Choose a password' : 'Protect with a password',
    recovery: 'Save your recovery key',
    done: 'Your diary is encrypted',
  };
  const plainAction = source === 'import' ? 'Import without password' : 'Create without password';

  function close() {
    if (step === 'done') {
      app.encryptionSetupOpen = false;
    } else if (onboarding) {
      app.cancelPendingDiary();
    } else {
      app.discardPendingKeys();
      app.encryptionSetupOpen = false;
    }
  }

  async function busy(action: () => Promise<void>) {
    if (working) return;
    working = true;
    try {
      await action();
    } finally {
      working = false;
    }
  }

  function confirmChoice() {
    if (choice === 'encrypt') {
      step = 'password';
      return;
    }
    void busy(async () => {
      await app.keepPendingDiaryPlain();
    });
  }

  function choosePassword(e: SubmitEvent) {
    e.preventDefault();
    if (!passwordValid) return;
    void busy(async () => {
      recoveryKey = await app.prepareEncryption(password);
      password = '';
      step = 'recovery';
    });
  }

  function encrypt() {
    if (!recoverySaved) return;
    void busy(async () => {
      if (await app.confirmEncryption()) {
        recoveryKey = '';
        step = 'done';
      }
    });
  }

  const secondary =
    'rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-40';
  const primary =
    'rounded-lg bg-text px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-text/90 disabled:opacity-40';
</script>

{#snippet caution(text: string)}
  <p class="flex gap-2 text-[0.8rem] leading-snug text-amber-200/90">
    <svg class="mt-px shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    <span>{text}</span>
  </p>
{/snippet}

{#snippet radioDot(on: boolean)}
  <span
    class="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors {on ? 'border-text' : 'border-faint'}"
    aria-hidden="true"
  >
    {#if on}<span class="h-2 w-2 rounded-full bg-text"></span>{/if}
  </span>
{/snippet}

<Modal
  title={titles[step]}
  subtitle={step === 'password' ? 'Step 1 of 2' : step === 'recovery' ? 'Step 2 of 2' : undefined}
  onclose={close}
  locked={working}
  width={step === 'choice' ? 'sm:max-w-md' : 'sm:max-w-sm'}
>
  {#if step === 'choice'}
    <p class="mb-4 text-sm leading-relaxed text-muted">
      Choose how the diary is stored in {where}. You can change this later in Settings.
    </p>

    <div class="space-y-2" role="radiogroup" aria-label="Diary protection">
      <label
        class="block cursor-pointer rounded-xl border px-4 py-3.5 transition-colors
          has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-muted
          {choice === 'encrypt' ? 'border-muted bg-slate-soft' : 'border-slate hover:border-faint'}
          {app.encryptionSupported ? '' : 'pointer-events-none opacity-50'}"
      >
        <input
          type="radio"
          name="protection"
          value="encrypt"
          class="sr-only"
          bind:group={choice}
          disabled={!app.encryptionSupported}
        />
        <span class="flex items-start gap-3">
          <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border {choice === 'encrypt' ? 'border-muted text-text' : 'border-faint text-muted'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium text-text">Encrypt with a password</span>
              {#if app.encryptionSupported}
                <span class="rounded-full border border-emerald-400/30 px-2 py-px text-[0.68rem] font-medium text-emerald-300">Recommended</span>
              {/if}
            </span>
            <span class="mt-1 block text-[0.8rem] leading-relaxed text-muted">
              {#if app.encryptionSupported}
                Entries, drafts and your dictionary can't be read without the password. The diary
                locks itself when you step away.
              {:else}
                Needs a secure connection. Open Icarus over HTTPS (or on localhost), or use the
                desktop app.
              {/if}
            </span>
          </span>
          {@render radioDot(choice === 'encrypt')}
        </span>
        {#if choice === 'encrypt' && app.encryptionSupported}
          <span class="ml-11 mt-2.5 block" transition:slide={{ duration: 160 }}>
            {@render caution('No password reset. Lose the password and recovery key, lose the diary.')}
          </span>
        {/if}
      </label>

      <label
        class="block cursor-pointer rounded-xl border px-4 py-3.5 transition-colors
          has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-muted
          {choice === 'plain' ? 'border-muted bg-slate-soft' : 'border-slate hover:border-faint'}"
      >
        <input type="radio" name="protection" value="plain" class="sr-only" bind:group={choice} />
        <span class="flex items-start gap-3">
          <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border {choice === 'plain' ? 'border-muted text-text' : 'border-faint text-muted'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-text">Don't encrypt</span>
            <span class="mt-1 block text-[0.8rem] leading-relaxed text-muted">
              Opens without a password{isDesktop ? ', and the file stays a standard .ics' : ''}.
              Anyone with access to {isDesktop ? 'the folder' : app.appPlace} can read it.
            </span>
          </span>
          {@render radioDot(choice === 'plain')}
        </span>
      </label>
    </div>

    <div class="mt-5 flex items-center justify-end gap-2">
      <button class={secondary} onclick={close} disabled={working}>Cancel</button>
      <button class={primary} onclick={confirmChoice} disabled={working}>
        {#if choice === 'encrypt'}
          Continue
        {:else}
          {working ? 'Saving…' : plainAction}
        {/if}
      </button>
    </div>
  {:else if step === 'password'}
    <form onsubmit={choosePassword}>
      {#if !onboarding}
        <p class="mb-4 text-sm leading-relaxed text-muted">
          Encrypts your entries, drafts and dictionary{isDesktop ? ' as diary.icarus' : ''}.
        </p>
      {/if}
      <NewPasswordFields bind:password bind:valid={passwordValid} label="Password" autofocus />
      {#if !onboarding}
        <div class="mt-4">
          {@render caution('No password reset. Lose the password and recovery key, lose the diary.')}
        </div>
      {/if}
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class={secondary}
          onclick={() => (onboarding ? (step = 'choice') : close())}
          disabled={working}
        >
          {onboarding ? 'Back' : 'Cancel'}
        </button>
        <button type="submit" class={primary} disabled={!passwordValid || working}>
          {working ? 'Preparing…' : 'Continue'}
        </button>
      </div>
    </form>
  {:else if step === 'recovery'}
    <p class="mb-4 text-sm leading-relaxed text-muted">
      The only way in if you forget the password. Keep it apart from the diary, for example in a
      password manager. It won't be shown again.
    </p>
    <RecoveryKeyPanel {recoveryKey} bind:confirmed={recoverySaved} />
    <div class="mt-5 flex justify-end gap-2">
      <button class={secondary} onclick={close} disabled={working}>Cancel</button>
      <button class={primary} onclick={encrypt} disabled={!recoverySaved || working}>
        {#if working}
          Encrypting…
        {:else}
          {source === 'new' ? 'Create encrypted diary' : source === 'import' ? 'Import encrypted' : 'Encrypt diary'}
        {/if}
      </button>
    </div>
  {:else}
    <div class="space-y-3 text-sm leading-relaxed text-muted">
      <p>
        {#if source === 'settings' && isDesktop}
          Drafts and your dictionary too. The plain diary.ics was removed.
        {:else if source === 'settings'}
          Drafts and your dictionary are encrypted too.
        {:else}
          Entries, drafts and your dictionary are stored encrypted.
        {/if}
        {app.autoLockMinutes
          ? `It locks after ${app.autoLockMinutes} minutes of inactivity.`
          : 'Automatic locking is off.'}
      </p>
      {#if source === 'import'}
        {@render caution('The .ics you imported is unchanged and still readable. Delete it if you no longer need it.')}
      {:else if source === 'settings'}
        {@render caution(isDesktop
          ? 'Older copies (exports, backups, sync history) are still readable.'
          : 'Backups you exported earlier are still readable.')}
      {/if}
    </div>
    <div class="mt-5 flex justify-end">
      <button class={primary} onclick={close}>{onboarding ? 'Open diary' : 'Done'}</button>
    </div>
  {/if}
</Modal>
