<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { vaultFileName } from '../lib/storage';
  import { DATE_FORMATS, longDayLabel, type DateFormat } from '../lib/date';
  import { SOURCE_REPO, openExternal } from '../lib/external';
  import { AUTO_LOCK_CHOICES } from '../lib/config';
  import { install } from '../lib/install.svelte';
  import { updates } from '../lib/updates.svelte';
  import { timeAgo } from '../lib/date';
  import UpdateMark from './UpdateMark.svelte';
  import Switch from './Switch.svelte';
  import Modal from './Modal.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  // Show only the file name in the chip, but keep the full path as a tooltip.
  const fileName = $derived(vaultFileName(app.vault));

  // An app-owned vault (browser or device) has no other copy: "forget" deletes real data.
  const isAppVault = $derived(app.vault?.kind === 'app');

  // Local confirmation step for the destructive vault action.
  let confirmForget = $state(false);

  // Localised long names for the two week-start choices (Sun = index 0).
  const fmtWeekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
  const weekStartOptions = [
    { value: 1 as const, label: fmtWeekday.format(new Date(2023, 0, 2)) }, // Monday
    { value: 0 as const, label: fmtWeekday.format(new Date(2023, 0, 1)) }, // Sunday
  ];

  // Each choice previews itself with a fixed sample date so the order is obvious.
  const FORMAT_NAMES: Record<DateFormat, string> = {
    auto: 'System',
    dmy: 'Day first',
    mdy: 'Month first',
    iso: 'Year first',
  };
  const sampleDay = new Date(2026, 5, 8);
  const dateFormatOptions = DATE_FORMATS.map((value) => ({
    value,
    name: FORMAT_NAMES[value],
    sample: longDayLabel(sampleDay, value),
  }));

  async function forget() {
    await app.forgetVault();
    confirmForget = false;
  }

  function exportBackup() {
    if (app.encrypted) app.exportOpen = true;
    else void app.exportVault();
  }

  /** Open a privacy dialog on top of a closed settings panel. */
  function openPrivacy(open: () => void) {
    app.settingsOpen = false;
    open();
  }

  /** Hand over to the browser's install dialog, or to the instructions. */
  function installApp() {
    app.settingsOpen = false;
    void install.start();
  }

  const installHint = $derived(
    install.method === 'ios'
      ? 'Add Icarus to your Home Screen and open it like any other app'
      : install.method === 'mac-safari'
        ? 'Add Icarus to your Dock and open it like any other app'
        : 'Open Icarus in its own window, like any other app, even offline',
  );

  // The answer to the last check, shown beside the version.
  const updateStatus = $derived(
    updates.status === 'checking'
      ? 'Checking…'
      : updates.status === 'failed'
        ? 'Could not reach icarus.4oli.com'
        : updates.status === 'done' && !updates.available
          ? 'Up to date'
          : '',
  );

  function saveUpdatePref(save: Promise<void>) {
    save.catch(() => app.toast('error', 'Could not save settings to the diary folder.'));
  }

  function getUpdate() {
    app.settingsOpen = false;
    void updates.download();
  }

  /** Desktop checks in place; Android hands over to the browser. */
  function checkNow() {
    if (updates.canCheck) void updates.check();
    else void updates.lookForUpdate();
  }

  const autoLockLabel = (minutes: number) => (minutes === 0 ? 'Never' : `${minutes} min`);
</script>

{#if app.settingsOpen}
  <Modal title="Settings" onclose={() => (app.settingsOpen = false)} width="sm:max-w-lg" z="z-50">
    <!-- Current diary location -->
    <div class="mb-5 rounded-lg border border-slate bg-slate-soft px-3.5 py-3">
      <p class="text-[0.7rem] font-medium uppercase tracking-wider text-muted">
        {isAppVault ? 'Current diary' : 'Current folder'}
      </p>
      {#if app.vault?.kind === 'file'}
        <p class="mt-1 truncate text-sm text-text" title={app.vault.path}>{fileName}</p>
        <p class="mt-0.5 truncate text-xs text-muted" title={app.vault.path}>{app.vault.path}</p>
        <p class="mt-1 text-xs text-muted">Drafts and settings are saved beside this file.</p>
      {:else}
        <p class="mt-1 text-sm text-text">{app.appPlace.charAt(0).toUpperCase() + app.appPlace.slice(1)}</p>
        <p class="mt-0.5 text-xs text-muted">
          {app.storageKind === 'device'
            ? 'Stored privately inside the app. Uninstalling it erases the diary, so export a backup to keep it safe'
            : 'Stored locally in IndexedDB. Export a backup to keep it safe'}
        </p>
      {/if}
      <p class="mt-1 text-xs text-muted">
        {app.entries.length}
        {app.entries.length === 1 ? 'entry' : 'entries'}
      </p>
    </div>

    {#if app.storageKind === 'folder'}
      <div class="mb-5 flex items-center justify-between gap-4">
        <span>
          <span class="block text-sm text-text">Open this folder on launch</span>
          <span class="block text-xs text-muted">
            {app.rememberFolder
              ? 'Only its location is saved on this computer'
              : 'Nothing is saved on this computer; choose the folder each time'}
          </span>
        </span>
        <Switch checked={app.rememberFolder} label="Open this folder on launch" onchange={(on) => app.setRememberFolder(on)} />
      </div>
    {/if}

    <!-- Actions -->
    <div class="space-y-2">
      {#if app.storageKind === 'folder'}
        <button
          class="flex w-full items-center gap-3 rounded-lg border border-slate px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate"
          onclick={() => app.openVaultFolder()}
          disabled={app.busy}
        >
          <span>
            <span class="block font-medium">Open another folder</span>
            <span class="block text-xs text-muted">Open its diary or create diary.ics there</span>
          </span>
        </button>
      {/if}
      <button
        class="flex w-full items-center gap-3 rounded-lg border border-slate px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate"
        onclick={() => app.importVault()}
        disabled={app.busy}
      >
        <svg class="text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
        <span>
          <span class="block font-medium">Import .ics</span>
          <span class="block text-xs text-muted">
            {app.storageKind === 'folder'
              ? 'Copy an .ics into a folder you choose'
              : 'Open a different diary file'}
          </span>
        </span>
      </button>

      <button
        class="flex w-full items-center gap-3 rounded-lg border border-slate px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate"
        onclick={exportBackup}
        disabled={app.busy}
      >
        <svg class="text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
        <span>
          <span class="block font-medium">Export backup</span>
          <span class="block text-xs text-muted">
            {app.encrypted
              ? 'Encrypted by default, or a plain .ics'
              : isAppVault
                ? 'Download a .ics copy you can keep or re-import'
                : 'Save a copy to any folder or USB drive'}
          </span>
        </span>
      </button>

      {#if install.available}
        <button
          class="flex w-full items-center gap-3 rounded-lg border border-slate px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate"
          onclick={installApp}
        >
          <svg class="shrink-0 text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 7v7"/><path d="m9 11 3 3 3-3"/></svg>
          <span>
            <span class="block font-medium">Install the app</span>
            <span class="block text-xs text-muted">{installHint}</span>
          </span>
        </button>
      {/if}

      {#if app.vault}
        <button
          class="flex w-full items-center gap-3 rounded-lg border border-red-400/40 px-3.5 py-3 text-left text-sm text-red-400 transition-colors hover:bg-red-400/10"
          onclick={() => (confirmForget = true)}
          disabled={app.busy}
        >
          <svg class="text-red-400/80" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"/><path d="M12 2v10"/></svg>
          <span>
            {#if isAppVault}
              <span class="block font-medium">Delete diary</span>
              <span class="block text-xs text-red-400/70">Erase it from {app.appPlace}</span>
            {:else}
              <span class="block font-medium">Close folder</span>
              <span class="block text-xs text-red-400/70">Leave all files in the chosen folder</span>
            {/if}
          </span>
        </button>
      {/if}
    </div>

    <!-- Privacy -->
    <div class="mt-5 border-t border-slate pt-5">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-[0.7rem] font-medium uppercase tracking-wider text-muted">Privacy</p>
        {#if app.encrypted}
          <span class="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            Encrypted
          </span>
        {/if}
      </div>

      {#if app.encrypted}
        <div class="space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <button
              class="rounded-lg border border-slate px-3 py-2 text-sm text-text transition-colors hover:bg-slate disabled:opacity-60"
              onclick={() => app.lock()}
              disabled={app.busy}
            >
              Lock now
            </button>
            <button
              class="rounded-lg border border-slate px-3 py-2 text-sm text-text transition-colors hover:bg-slate"
              onclick={() => openPrivacy(() => (app.privacyDialog = 'password'))}
            >
              Change password
            </button>
          </div>
          <button
            class="w-full rounded-lg border border-slate px-3 py-2 text-sm text-text transition-colors hover:bg-slate"
            onclick={() => openPrivacy(() => (app.privacyDialog = 'recovery'))}
          >
            New recovery key
          </button>
        </div>

        <p class="mb-2 mt-4 text-xs text-muted">Lock after inactivity</p>
        <div class="grid grid-cols-4 gap-1.5">
          {#each AUTO_LOCK_CHOICES as minutes (minutes)}
            <button
              class="rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors
                {app.autoLockMinutes === minutes
                  ? 'border-faint bg-slate text-text'
                  : 'border-slate text-muted hover:bg-slate hover:text-text'}"
              aria-pressed={app.autoLockMinutes === minutes}
              onclick={() => app.setAutoLock(minutes)}
            >
              {autoLockLabel(minutes)}
            </button>
          {/each}
        </div>

        <div class="mt-4 flex items-center justify-between gap-4">
          <span>
            <span class="block text-sm text-text">Lock when hidden</span>
            <span class="block text-xs text-muted">Lock as soon as the window is minimized or switched away</span>
          </span>
          <Switch checked={app.lockWhenHidden} label="Lock when hidden" onchange={(on) => app.setLockWhenHidden(on)} />
        </div>

        <button
          class="mt-4 text-xs text-muted underline-offset-4 transition-colors hover:text-red-400 hover:underline"
          onclick={() => openPrivacy(() => (app.privacyDialog = 'disable'))}
        >
          Remove encryption…
        </button>
      {:else if !app.encryptionSupported}
        <p class="text-xs leading-relaxed text-muted">
          Password protection needs a secure connection. Open Icarus over HTTPS (or on localhost),
          or use the desktop app.
        </p>
      {:else}
        <button
          class="flex w-full items-center gap-3 rounded-lg border border-slate px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate disabled:opacity-50"
          onclick={() => app.openEncryptionSetup()}
          disabled={app.busy}
        >
          <svg class="shrink-0 text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          <span>
            <span class="block font-medium">Protect with a password</span>
            <span class="block text-xs text-muted">Encrypt the diary, drafts and dictionary</span>
          </span>
        </button>
      {/if}
    </div>

    <!-- Preferences -->
    <div class="mt-5 space-y-5 border-t border-slate pt-5">
      <div>
        <p class="mb-2 text-[0.7rem] font-medium uppercase tracking-wider text-muted">
          Week starts on
        </p>
        <div class="grid grid-cols-2 gap-2">
          {#each weekStartOptions as opt (opt.value)}
            <button
              class="rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors
                {app.weekStart === opt.value
                  ? 'border-faint bg-slate text-text'
                  : 'border-slate text-muted hover:bg-slate hover:text-text'}"
              aria-pressed={app.weekStart === opt.value}
              onclick={() => app.setWeekStart(opt.value)}
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>

      <div>
        <p class="mb-2 text-[0.7rem] font-medium uppercase tracking-wider text-muted">
          Date format
        </p>
        <div class="grid grid-cols-1 gap-2" role="group" aria-label="Date format">
          {#each dateFormatOptions as opt (opt.value)}
            <button
              class="flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors
                {app.dateFormat === opt.value
                  ? 'border-faint bg-slate text-text'
                  : 'border-slate text-muted hover:bg-slate hover:text-text'}"
              aria-pressed={app.dateFormat === opt.value}
              onclick={() => app.setDateFormat(opt.value)}
            >
              <span class="font-medium">{opt.name}</span>
              <span class="truncate text-xs text-muted">{opt.sample}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="flex items-center justify-between gap-4">
        <span>
          <span class="block text-sm text-text">Spell check</span>
          <span class="block text-xs text-muted">Underline misspellings in English</span>
        </span>
        <Switch checked={app.spellcheck} label="Spell check" onchange={(on) => app.setSpellcheck(on)} />
      </div>
    </div>

    <!-- Updates (desktop app only) -->
    {#if updates.supported}
      <div class="mt-5 border-t border-slate pt-5">
        <p class="mb-2 text-[0.7rem] font-medium uppercase tracking-wider text-muted">Updates</p>

        {#if updates.available && updates.latest}
          <div class="update-row mb-4 flex items-center gap-3 rounded-lg border border-[#f5b452]/25 px-3.5 py-3">
            <UpdateMark size="sm" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-text">Version {updates.latest.version} is ready</span>
              <span class="block text-xs text-muted">Released {timeAgo(new Date(updates.latest.published))}</span>
            </span>
            <button
              class="shrink-0 rounded-lg bg-text px-3 py-1.5 text-xs font-semibold text-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
              onclick={getUpdate}
            >
              Get the update
            </button>
          </div>
        {/if}

        <div class="flex items-center justify-between gap-4">
          <span class="min-w-0">
            <span class="block text-sm text-text">Icarus <span class="tabular-nums">{updates.current}</span></span>
            <span class="block text-xs {updates.status === 'failed' ? 'text-red-400/80' : 'text-muted'}" aria-live="polite">
              {updateStatus || (updates.canCheck ? 'Installed version' : 'Opens the download page in your browser')}
            </span>
          </span>
          <button
            class="flex shrink-0 items-center gap-2 rounded-lg border border-slate px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-slate disabled:opacity-60"
            onclick={checkNow}
            disabled={updates.status === 'checking'}
          >
            {#if updates.canCheck}
              <svg class={updates.status === 'checking' ? 'animate-spin' : ''} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>
              Check now
            {:else}
              Check online
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>
            {/if}
          </button>
        </div>

        {#if updates.canCheck}
          <div class="mt-4 flex items-center justify-between gap-4">
            <span>
              <span class="block text-sm text-text">Check automatically</span>
              <span class="block text-xs text-muted">
                Asks icarus.4oli.com for the latest version number every few hours. Nothing about
                you or your diary is sent.
              </span>
            </span>
            <Switch checked={updates.enabled} label="Check for updates automatically" onchange={(on) => saveUpdatePref(updates.setEnabled(on))} />
          </div>
        {/if}

        {#if !updates.canCheck || !updates.enabled}
          <div class="mt-4 flex items-center justify-between gap-4">
            <span>
              <span class="block text-sm text-text">Monthly reminder</span>
              <span class="block text-xs text-muted">
                {updates.canCheck
                  ? 'Once a month, ask whether to look for a new version'
                  : 'Once a month, ask whether to look for a new version. Icarus itself never goes online'}
              </span>
            </span>
            <Switch checked={updates.reminders} label="Monthly update reminder" onchange={(on) => saveUpdatePref(updates.setReminders(on))} />
          </div>
        {/if}
      </div>
    {/if}

    <!-- Source code -->
    <div class="mt-5 flex justify-center border-t border-slate pt-4">
      <a
        class="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:text-text"
        href={SOURCE_REPO.url}
        target="_blank"
        rel="noopener noreferrer"
        onclick={(e) => {
          e.preventDefault();
          void openExternal(SOURCE_REPO.url);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>
        {SOURCE_REPO.label}
      </a>
    </div>
  </Modal>

  {#if confirmForget}
    <ConfirmDialog
      title={isAppVault ? 'Delete this diary?' : 'Close this folder?'}
      confirmLabel={isAppVault ? 'Delete diary' : 'Close folder'}
      onconfirm={forget}
      oncancel={() => (confirmForget = false)}
      busy={app.busy}
      z="z-[60]"
    >
      {#if isAppVault}
        All <span class="text-text">{app.entries.length}</span>
        {app.entries.length === 1 ? 'entry' : 'entries'} stored in {app.appPlace}
        and their drafts will be permanently erased. Export a backup first if you may want them
        back. This can't be undone.
      {:else}
        Icarus will close
        {#if fileName}<span class="text-text">{fileName}</span>{:else}this file{/if}
        and return to the welcome screen. The diary, drafts and settings remain in the chosen folder.
      {/if}
    </ConfirmDialog>
  {/if}
{/if}

<style>
  .update-row {
    background: linear-gradient(100deg, color-mix(in oklab, #f5b452 9%, transparent), transparent 70%);
  }
</style>
