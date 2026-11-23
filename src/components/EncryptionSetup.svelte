<script lang="ts">
  import { slide } from 'svelte/transition';
  import BusyLabel from './BusyLabel.svelte';
  import Modal from './Modal.svelte';
  import NewPasswordFields from './NewPasswordFields.svelte';
  import RecoveryKeyPanel from './RecoveryKeyPanel.svelte';
  import { app } from '../lib/store.svelte';
  import { fmt, t } from '../lib/i18n/index.svelte';

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

  let step = $state<Step>(onboarding ? 'choice' : 'password');
  let choice = $state<'encrypt' | 'plain'>(app.encryptionSupported ? 'encrypt' : 'plain');
  let password = $state('');
  let passwordValid = $state(false);
  let recoveryKey = $state('');
  let recoverySaved = $state(false);
  let working = $state(false);

  const device = app.storageKind === 'device';

  const titles: Record<Step, string> = $derived({
    choice: source === 'import' ? t.privacy.protectImportedTitle : t.privacy.protectNewTitle,
    password: onboarding ? t.privacy.chooseAPassword : t.privacy.protectWithPassword,
    recovery: t.privacy.saveRecoveryKey,
    done: t.privacy.diaryEncrypted,
  });
  const plainAction = $derived(source === 'import' ? t.privacy.importWithoutPassword : t.privacy.createWithoutPassword);
  const encryptAction = $derived(
    source === 'new'
      ? t.privacy.createEncryptedDiary
      : source === 'import'
        ? t.privacy.importEncrypted
        : t.privacy.encryptDiary,
  );

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
  subtitle={step === 'password'
    ? fmt(t.privacy.stepOf, { step: 1, total: 2 })
    : step === 'recovery'
      ? fmt(t.privacy.stepOf, { step: 2, total: 2 })
      : undefined}
  onclose={close}
  locked={working}
  width={step === 'choice' ? 'sm:max-w-md' : 'sm:max-w-sm'}
>
  {#if step === 'choice'}
    <p class="mb-4 text-sm leading-relaxed text-muted">
      {device ? t.privacy.choiceIntroDevice : t.privacy.choiceIntroBrowser}
    </p>

    <div class="space-y-2" role="radiogroup" aria-label={t.privacy.protectionLabel}>
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
              <span class="text-sm font-medium text-text">{t.privacy.encryptOption}</span>
              {#if app.encryptionSupported}
                <span class="rounded-full border border-emerald-400/30 px-2 py-px text-[0.68rem] font-medium text-emerald-300">{t.privacy.recommended}</span>
              {/if}
            </span>
            <span class="mt-1 block text-[0.8rem] leading-relaxed text-muted">
              {#if app.encryptionSupported}
                {t.privacy.encryptOptionHint}
              {:else}
                {t.privacy.needsSecureConnection}
              {/if}
            </span>
          </span>
          {@render radioDot(choice === 'encrypt')}
        </span>
        {#if choice === 'encrypt' && app.encryptionSupported}
          <span class="ml-11 mt-2.5 block" transition:slide={{ duration: 160 }}>
            {@render caution(t.privacy.noPasswordReset)}
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
            <span class="block text-sm font-medium text-text">{t.privacy.plainOption}</span>
            <span class="mt-1 block text-[0.8rem] leading-relaxed text-muted">
              {device ? t.privacy.plainOptionHintDevice : t.privacy.plainOptionHintBrowser}
            </span>
          </span>
          {@render radioDot(choice === 'plain')}
        </span>
      </label>
    </div>

    <div class="mt-5 flex items-center justify-end gap-2">
      <button class={secondary} onclick={close} disabled={working}>{t.common.cancel}</button>
      <button class={primary} onclick={confirmChoice} disabled={working}>
        {#if choice === 'encrypt'}
          {t.common.continue}
        {:else}
          {#if working}<BusyLabel>{t.privacy.saving}</BusyLabel>{:else}{plainAction}{/if}
        {/if}
      </button>
    </div>
  {:else if step === 'password'}
    <form onsubmit={choosePassword}>
      {#if !onboarding}
        <p class="mb-4 text-sm leading-relaxed text-muted">
          {t.privacy.protectWithPasswordIntro}
        </p>
      {/if}
      <NewPasswordFields bind:password bind:valid={passwordValid} label={t.privacy.password} autofocus />
      {#if !onboarding}
        <div class="mt-4">
          {@render caution(t.privacy.noPasswordReset)}
        </div>
      {/if}
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class={secondary}
          onclick={() => (onboarding ? (step = 'choice') : close())}
          disabled={working}
        >
          {onboarding ? t.common.back : t.common.cancel}
        </button>
        <button type="submit" class={primary} disabled={!passwordValid || working}>
          {#if working}<BusyLabel>{t.privacy.preparing}</BusyLabel>{:else}{t.common.continue}{/if}
        </button>
      </div>
    </form>
  {:else if step === 'recovery'}
    <p class="mb-4 text-sm leading-relaxed text-muted">
      {t.privacy.recoveryKeyIntro}
    </p>
    <RecoveryKeyPanel {recoveryKey} bind:confirmed={recoverySaved} />
    <div class="mt-5 flex justify-end gap-2">
      <button class={secondary} onclick={close} disabled={working}>{t.common.cancel}</button>
      <button class={primary} onclick={encrypt} disabled={!recoverySaved || working}>
        {#if working}
          <BusyLabel>{t.privacy.encrypting}</BusyLabel>
        {:else}
          {encryptAction}
        {/if}
      </button>
    </div>
  {:else}
    <div class="space-y-3 text-sm leading-relaxed text-muted">
      <p>
        {source === 'settings' ? t.privacy.doneFromSettings : t.privacy.doneNewOrImported}
        {app.autoLockMinutes
          ? fmt(t.privacy.autoLockAfter, { count: app.autoLockMinutes })
          : t.privacy.autoLockOff}
      </p>
      {#if source === 'import'}
        {@render caution(t.privacy.importedFileUnchanged)}
      {:else if source === 'settings'}
        {@render caution(t.privacy.earlierBackupsReadable)}
      {/if}
    </div>
    <div class="mt-5 flex justify-end">
      <button class={primary} onclick={close}>{onboarding ? t.privacy.openDiary : t.common.done}</button>
    </div>
  {/if}
</Modal>
