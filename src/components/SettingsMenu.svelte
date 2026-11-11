<script lang="ts">
  /**
   * Everything adjustable, grouped by what it is about: the diary and its
   * backups, writing, dates, privacy, the app itself and, set apart at the
   * end, deleting the diary. Every setting is one row (SettingsRow) with one
   * of three controls: a switch for on/off, a segmented control for two short
   * choices, a select for more.
   */
  import { app } from '../lib/store.svelte';
  import { DATE_FORMATS, longDayLabel, timeAgo, type DateFormat } from '../lib/date';
  import { SOURCE_REPO, openExternal } from '../lib/external';
  import { AUTO_LOCK_CHOICES, type AutoLockMinutes } from '../lib/config';
  import { LENGTH_COUNTS, lengthLabel, type LengthCount } from '../lib/text-count';
  import { install } from '../lib/install.svelte';
  import { PLATFORM_NAMES } from '../lib/user-agent';
  import { updates } from '../lib/updates.svelte';
  import UpdateMark from './UpdateMark.svelte';
  import Switch from './Switch.svelte';
  import Modal from './Modal.svelte';
  import Select, { type SelectOption } from './Select.svelte';
  import Segmented from './Segmented.svelte';
  import SettingsRow from './SettingsRow.svelte';
  import SettingsSection from './SettingsSection.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import DictionaryDialog from './DictionaryDialog.svelte';

  // Local confirmation step for the destructive vault action.
  let confirmForget = $state(false);
  // The personal dictionary opens over Settings, so closing it returns here.
  let dictionaryOpen = $state(false);
  const dictionaryHint = $derived(
    app.spellWords.length
      ? `${app.spellWords.length} ${app.spellWords.length === 1 ? 'word' : 'words'} added`
      : 'Words you add while writing show up here',
  );

  // Localised long names for the two week-start choices (Sun = index 0).
  const fmtWeekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
  const weekStartOptions = [
    { value: 1 as const, label: fmtWeekday.format(new Date(2023, 0, 2)) }, // Monday
    { value: 0 as const, label: fmtWeekday.format(new Date(2023, 0, 1)) }, // Sunday
  ];

  // Each format previews itself with a fixed sample date so the order is obvious.
  const FORMAT_NAMES: Record<DateFormat, string> = {
    auto: 'System',
    dmy: 'Day first',
    mdy: 'Month first',
    iso: 'Year first',
  };
  const sampleDay = new Date(2026, 5, 8);
  const dateFormatOptions: SelectOption<DateFormat>[] = DATE_FORMATS.map((value) => ({
    value,
    label: FORMAT_NAMES[value],
    hint: longDayLabel(sampleDay, value),
  }));

  // The editor's length count, previewed with a sample entry as it would appear.
  const LENGTH_COUNT_NAMES: Record<LengthCount, string> = {
    words: 'Words',
    chars: 'Characters',
    both: 'Both',
    off: 'Off',
  };
  const lengthCountOptions = LENGTH_COUNTS.map((value) => ({ value, label: LENGTH_COUNT_NAMES[value] }));
  const countPreview = $derived(
    app.lengthCount === 'off'
      ? 'No count while reading or writing'
      : `Shown with each entry, like “${lengthLabel({ words: 248, chars: 1312 }, app.lengthCount)}”`,
  );

  const autoLockOptions: SelectOption<AutoLockMinutes>[] = AUTO_LOCK_CHOICES.map((minutes) => ({
    value: minutes,
    label: minutes === 0 ? 'Never' : `${minutes} min`,
  }));

  const place = app.appPlace.charAt(0).toUpperCase() + app.appPlace.slice(1);
  const entryCount = $derived(
    `${app.entries.length.toLocaleString()} ${app.entries.length === 1 ? 'entry' : 'entries'}`,
  );

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

  /** Open the download page, the browser's install dialog, or the instructions. */
  function installApp() {
    app.settingsOpen = false;
    void install.start();
  }

  const exportHint = $derived(
    app.encrypted
      ? 'Encrypted by default, or a plain .ics'
      : app.storageKind === 'device'
        ? 'Save a .ics copy to any folder or USB drive'
        : 'Download a .ics copy you can keep or re-import',
  );

  const installHint = $derived(
    install.platform
      ? `Download Icarus for ${PLATFORM_NAMES[install.platform]}`
      : install.method === 'ios'
        ? 'Add Icarus to your Home Screen and open it like any other app'
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
    save.catch(() => app.toast('error', 'Could not save settings.'));
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
</script>

{#if app.settingsOpen}
  <Modal title="Settings" onclose={() => (app.settingsOpen = false)} width="sm:max-w-md" z="z-sheet">
    <SettingsSection title="Diary">
      <SettingsRow
        label={place}
        hint={app.storageKind === 'device'
          ? 'Stored privately inside the app, with a copy of each of the last 7 days'
          : 'Stored locally in IndexedDB. Export a backup to keep it safe'}
      >
        <span class="text-xs tabular-nums text-muted">{entryCount}</span>
      </SettingsRow>
      <SettingsRow label="Export backup" hint={exportHint} onclick={exportBackup} disabled={app.busy} />
      <SettingsRow
        label="Import .ics"
        hint="Replace this diary with one from a file"
        onclick={() => app.importVault()}
        disabled={app.busy}
      />
    </SettingsSection>

    <SettingsSection title="Writing">
      <SettingsRow label="Spell check" hint="Underline misspellings in English">
        <Switch checked={app.spellcheck} label="Spell check" onchange={(on) => app.setSpellcheck(on)} />
      </SettingsRow>
      <SettingsRow label="Personal dictionary" hint={dictionaryHint} onclick={() => (dictionaryOpen = true)} />
      <SettingsRow label="Length count" hint={countPreview}>
        <Select
          value={app.lengthCount}
          options={lengthCountOptions}
          onchange={(shown) => app.setLengthCount(shown)}
          label="Length count"
        />
      </SettingsRow>
      <!-- Only matters while there is a count to hide. -->
      <SettingsRow
        label="Hide the count while typing"
        hint="It returns when you pause"
        disabled={app.lengthCount === 'off'}
      >
        <Switch
          checked={app.countHidesWhileTyping}
          label="Hide the count while typing"
          disabled={app.lengthCount === 'off'}
          onchange={(on) => app.setCountHidesWhileTyping(on)}
        />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection title="Dates">
      <SettingsRow label="Week starts on">
        <Segmented
          value={app.weekStart}
          options={weekStartOptions}
          onchange={(day) => app.setWeekStart(day)}
          label="Week starts on"
        />
      </SettingsRow>
      <SettingsRow label="Date format" hint={longDayLabel(sampleDay, app.dateFormat)}>
        <Select
          value={app.dateFormat}
          options={dateFormatOptions}
          onchange={(format) => app.setDateFormat(format)}
          label="Date format"
        />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection title="Privacy">
      {#snippet badge()}
        {#if app.encrypted}
          <span class="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            Encrypted
          </span>
        {/if}
      {/snippet}

      {#if app.encrypted}
        <SettingsRow
          label="Lock now"
          hint="Close the diary until the password is entered"
          onclick={() => app.lock()}
          disabled={app.busy}
          trailing="none"
        >
          <svg class="text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        </SettingsRow>
        <SettingsRow label="Lock after inactivity">
          <Select
            value={app.autoLockMinutes}
            options={autoLockOptions}
            onchange={(minutes) => app.setAutoLock(minutes)}
            label="Lock after inactivity"
            listClass="min-w-28"
          />
        </SettingsRow>
        <SettingsRow label="Lock when hidden" hint="As soon as the window is minimized or switched away">
          <Switch checked={app.lockWhenHidden} label="Lock when hidden" onchange={(on) => app.setLockWhenHidden(on)} />
        </SettingsRow>
        <SettingsRow label="Change password" onclick={() => openPrivacy(() => (app.privacyDialog = 'password'))} />
        <SettingsRow
          label="New recovery key"
          hint="The current key stops working"
          onclick={() => openPrivacy(() => (app.privacyDialog = 'recovery'))}
        />
        <SettingsRow
          label="Remove encryption…"
          hint="Store the diary without a password"
          onclick={() => openPrivacy(() => (app.privacyDialog = 'disable'))}
        />
      {:else if !app.encryptionSupported}
        <p class="px-3.5 py-3 text-xs leading-relaxed text-muted">
          Password protection needs a secure connection. Open Icarus over HTTPS (or on localhost),
          or use the desktop app.
        </p>
      {:else}
        <SettingsRow
          label="Protect with a password"
          hint="Encrypt the diary, drafts and dictionary"
          onclick={() => app.openEncryptionSetup()}
          disabled={app.busy}
        />
      {/if}
    </SettingsSection>

    <SettingsSection title="App">
      {#if updates.supported}
        {#if updates.available && updates.latest}
          <div class="update-row flex items-center gap-3 rounded-t-[11px] px-3.5 py-3">
            <UpdateMark size="sm" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-text">Version {updates.latest.version} is ready</span>
              <span class="block text-xs text-muted">Released {timeAgo(new Date(updates.latest.published))}</span>
            </span>
            <button
              class="shrink-0 rounded-lg bg-text px-3 py-1.5 text-xs font-semibold text-ink transition-transform hover:[transform:scale(1.02)] active:[transform:scale(0.98)]"
              onclick={getUpdate}
            >
              Get the update
            </button>
          </div>
        {/if}

        <SettingsRow
          label="Icarus {updates.current}"
          hint={updateStatus || (updates.canCheck ? 'Installed version' : 'Checking opens the download page in your browser')}
          hintClass={updates.status === 'failed' ? 'text-red-400/80' : 'text-muted'}
        >
          <button
            class="flex items-center gap-2 rounded-lg border border-slate px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-60"
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
        </SettingsRow>

        {#if updates.canCheck}
          <SettingsRow
            label="Check for updates automatically"
            hint="Asks icarus.4oli.com for the latest version number every few hours. Nothing about you or your diary is sent"
          >
            <Switch checked={updates.enabled} label="Check for updates automatically" onchange={(on) => saveUpdatePref(updates.setEnabled(on))} />
          </SettingsRow>
        {/if}

        {#if !updates.canCheck || !updates.enabled}
          <SettingsRow
            label="Monthly update reminder"
            hint={updates.canCheck
              ? 'Once a month, ask whether to look for a new version'
              : 'Once a month, ask whether to look for a new version. Icarus itself never goes online'}
          >
            <Switch checked={updates.reminders} label="Monthly update reminder" onchange={(on) => saveUpdatePref(updates.setReminders(on))} />
          </SettingsRow>
        {/if}
      {/if}

      {#if install.available}
        <SettingsRow
          label="Install the app"
          hint={installHint}
          onclick={installApp}
          trailing={install.platform ? 'external' : 'chevron'}
        />
      {/if}

      <SettingsRow
        label="Source code"
        hint={SOURCE_REPO.label}
        href={SOURCE_REPO.url}
        onclick={() => void openExternal(SOURCE_REPO.url)}
      />
    </SettingsSection>

    <!-- Set apart from everything else, so it is never reached by accident. -->
    {#if app.vault}
      <SettingsSection title="Danger zone">
        <SettingsRow
          label="Delete diary"
          hint="Erase it from {app.appPlace}"
          tone="danger"
          onclick={() => (confirmForget = true)}
          disabled={app.busy}
        />
      </SettingsSection>
    {/if}
  </Modal>

  {#if dictionaryOpen}
    <DictionaryDialog onclose={() => (dictionaryOpen = false)} />
  {/if}

  {#if confirmForget}
    <ConfirmDialog
      title="Delete this diary?"
      confirmLabel="Delete diary"
      onconfirm={forget}
      oncancel={() => (confirmForget = false)}
      busy={app.busy}
      z="z-dialog"
    >
      All <span class="text-text">{app.entries.length}</span>
      {app.entries.length === 1 ? 'entry' : 'entries'} stored {app.appPlaceIn}, their drafts
      and any daily copies will be permanently erased. Export a backup first if you may want them
      back. This can't be undone.
    </ConfirmDialog>
  {/if}
{/if}

<style>
  .update-row {
    background: linear-gradient(100deg, color-mix(in oklab, #f5b452 9%, transparent), transparent 70%);
  }
</style>
