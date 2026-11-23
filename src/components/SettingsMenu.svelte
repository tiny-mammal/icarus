<script lang="ts">
  /**
   * Everything adjustable, grouped by what it is about: the diary and its
   * backups, writing, search, language and dates, day scores and habits, privacy, the app itself and, set apart at the
   * end, deleting the diary. Every setting is one row (SettingsRow) with one
   * of three controls: a switch for on/off, a segmented control for two short
   * choices, a select for more.
   */
  import { app } from '../lib/store.svelte';
  import { DATE_FORMATS, longDayLabel, timeAgo, type DateFormat } from '../lib/date';
  import { dateFormat, fmt, i18n, languageList, languageName, systemLocale, t } from '../lib/i18n/index.svelte';
  import { LOCALES, LOCALE_NAMES, type Locale } from '../lib/i18n/locales';
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
  import SpellcheckDialog from './SpellcheckDialog.svelte';
  import TrackerSettings from './TrackerSettings.svelte';

  // Local confirmation step for the destructive vault action.
  let confirmForget = $state(false);
  // The personal dictionary opens over Settings, so closing it returns here.
  let dictionaryOpen = $state(false);
  let spellcheckOpen = $state(false);
  const dictionaryHint = $derived(
    app.spellWords.length
      ? fmt(t.settings.dictionaryCount, { count: app.spellWords.length })
      : t.settings.dictionaryEmpty,
  );

  // Each language under its own name, so anyone can find theirs; the hint
  // names it in the language showing now.
  const languageOptions = $derived<SelectOption<Locale | 'system'>[]>([
    {
      value: 'system',
      label: t.settings.languageSystem,
      hint: fmt(t.settings.languageSystemHint, { language: LOCALE_NAMES[systemLocale()] }),
    },
    ...LOCALES.map((locale, i) => ({
      value: locale,
      label: LOCALE_NAMES[locale],
      hint: locale === i18n.locale ? undefined : languageName(locale),
      separated: i === 0,
    })),
  ]);

  const spellcheckHint = $derived(app.spellLocales.length ? languageList(app.spellLocales) : t.settings.spellcheckOff);

  // Localised long names for the two week-start choices (Sun = index 0).
  const weekStartOptions = $derived([
    { value: 1 as const, label: dateFormat({ weekday: 'long' }).format(new Date(2023, 0, 2)) }, // Monday
    { value: 0 as const, label: dateFormat({ weekday: 'long' }).format(new Date(2023, 0, 1)) }, // Sunday
  ]);

  const searchOrderOptions = $derived([
    { value: 'newest' as const, label: t.settings.newest },
    { value: 'oldest' as const, label: t.settings.oldest },
  ]);

  // Each format previews itself with a fixed sample date so the order is obvious.
  const formatNames = $derived<Record<DateFormat, string>>({
    auto: t.settings.dateFormatAuto,
    dmy: t.settings.dateFormatDmy,
    mdy: t.settings.dateFormatMdy,
    iso: t.settings.dateFormatIso,
  });
  const sampleDay = new Date(2026, 5, 8);
  const dateFormatOptions = $derived<SelectOption<DateFormat>[]>(
    DATE_FORMATS.map((value) => ({
      value,
      label: formatNames[value],
      hint: longDayLabel(sampleDay, value),
    })),
  );

  // The editor's length count, previewed with a sample entry as it would appear.
  const lengthCountNames = $derived<Record<LengthCount, string>>({
    words: t.settings.lengthCountWords,
    chars: t.settings.lengthCountChars,
    both: t.settings.lengthCountBoth,
    off: t.settings.lengthCountOff,
  });
  const lengthCountOptions = $derived(LENGTH_COUNTS.map((value) => ({ value, label: lengthCountNames[value] })));
  const countPreview = $derived(
    app.lengthCount === 'off'
      ? t.settings.lengthCountNone
      : fmt(t.settings.lengthCountPreview, {
          sample: lengthLabel({ words: 248, chars: 1312 }, app.lengthCount),
        }),
  );

  const autoLockOptions = $derived<SelectOption<AutoLockMinutes>[]>(
    AUTO_LOCK_CHOICES.map((minutes) => ({
      value: minutes,
      label: minutes === 0 ? t.settings.lockNever : fmt(t.settings.lockMinutes, { count: minutes }),
    })),
  );

  const device = app.storageKind === 'device';
  const entryCount = $derived(fmt(t.common.entries, { count: app.entries.length }));

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
      ? t.settings.exportHintEncrypted
      : device
        ? t.settings.exportHintDevice
        : t.settings.exportHintBrowser,
  );

  const installHint = $derived(
    install.platform
      ? fmt(t.settings.installDownload, { platform: PLATFORM_NAMES[install.platform] })
      : install.method === 'ios'
        ? t.settings.installIos
        : t.settings.installPwa,
  );

  // The answer to the last check, shown beside the version.
  const updateStatus = $derived(
    updates.status === 'checking'
      ? t.settings.checking
      : updates.status === 'failed'
        ? t.settings.checkFailed
        : updates.status === 'done' && !updates.available
          ? t.settings.upToDate
          : '',
  );

  function saveUpdatePref(save: Promise<void>) {
    save.catch(() => app.toast('error', t.common.couldNotSaveSettings));
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
  <Modal title={t.settings.title} onclose={() => (app.settingsOpen = false)} width="sm:max-w-md" z="z-sheet">
    <SettingsSection title={t.settings.language}>
      <SettingsRow label={t.settings.appLanguage} hint={t.settings.appLanguageHint}>
        <Select
          value={app.language ?? 'system'}
          options={languageOptions}
          onchange={(choice) => app.setLanguage(choice === 'system' ? null : choice)}
          label={t.settings.appLanguage}
          listClass="min-w-44"
        />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection title={t.settings.diary}>
      <SettingsRow
        label={device ? t.common.place.device : t.common.place.browser}
        hint={device ? t.settings.storedOnDevice : t.settings.storedInBrowser}
      >
        <span class="text-xs tabular-nums text-muted">{entryCount}</span>
      </SettingsRow>
      <SettingsRow label={t.settings.exportBackup} hint={exportHint} onclick={exportBackup} disabled={app.busy} />
      <SettingsRow
        label={t.settings.importIcs}
        hint={t.settings.importHint}
        onclick={() => app.importVault()}
        disabled={app.busy}
      />
    </SettingsSection>

    <SettingsSection title={t.settings.writing}>
      <SettingsRow label={t.settings.spellcheck} hint={spellcheckHint} onclick={() => (spellcheckOpen = true)} />
      <SettingsRow label={t.settings.personalDictionary} hint={dictionaryHint} onclick={() => (dictionaryOpen = true)} />
      <SettingsRow label={t.settings.lengthCount} hint={countPreview}>
        <Select
          value={app.lengthCount}
          options={lengthCountOptions}
          onchange={(shown) => app.setLengthCount(shown)}
          label={t.settings.lengthCount}
        />
      </SettingsRow>
      <!-- Only matters while there is a count to hide. -->
      <SettingsRow
        label={t.settings.hideCountWhileTyping}
        hint={t.settings.hideCountHint}
        disabled={app.lengthCount === 'off'}
      >
        <Switch
          checked={app.countHidesWhileTyping}
          label={t.settings.hideCountWhileTyping}
          disabled={app.lengthCount === 'off'}
          onchange={(on) => app.setCountHidesWhileTyping(on)}
        />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection title={t.settings.search}>
      <SettingsRow label={t.settings.resultsStartWith} hint={t.settings.resultsStartHint}>
        <Segmented
          value={app.searchOrder}
          options={searchOrderOptions}
          onchange={(order) => app.setSearchOrder(order)}
          label={t.settings.resultsStartWith}
        />
      </SettingsRow>
    </SettingsSection>

    <SettingsSection title={t.settings.dates}>
      <SettingsRow label={t.settings.weekStartsOn}>
        <Segmented
          value={app.weekStart}
          options={weekStartOptions}
          onchange={(day) => app.setWeekStart(day)}
          label={t.settings.weekStartsOn}
        />
      </SettingsRow>
      <SettingsRow label={t.settings.dateFormat} hint={longDayLabel(sampleDay, app.dateFormat)}>
        <Select
          value={app.dateFormat}
          options={dateFormatOptions}
          onchange={(format) => app.setDateFormat(format)}
          label={t.settings.dateFormat}
        />
      </SettingsRow>
    </SettingsSection>

    {#if app.vault}<TrackerSettings />{/if}

    <SettingsSection title={t.settings.privacy}>
      {#snippet badge()}
        {#if app.encrypted}
          <span class="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            {t.settings.encrypted}
          </span>
        {/if}
      {/snippet}

      {#if app.encrypted}
        <SettingsRow
          label={t.settings.lockNow}
          hint={t.settings.lockNowHint}
          onclick={() => app.lock()}
          disabled={app.busy}
          trailing="none"
        >
          <svg class="text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        </SettingsRow>
        <SettingsRow label={t.settings.lockAfterInactivity}>
          <Select
            value={app.autoLockMinutes}
            options={autoLockOptions}
            onchange={(minutes) => app.setAutoLock(minutes)}
            label={t.settings.lockAfterInactivity}
            listClass="min-w-28"
          />
        </SettingsRow>
        <SettingsRow label={t.settings.lockWhenHidden} hint={t.settings.lockWhenHiddenHint}>
          <Switch checked={app.lockWhenHidden} label={t.settings.lockWhenHidden} onchange={(on) => app.setLockWhenHidden(on)} />
        </SettingsRow>
        <SettingsRow label={t.settings.changePassword} onclick={() => openPrivacy(() => (app.privacyDialog = 'password'))} />
        <SettingsRow
          label={t.settings.newRecoveryKey}
          hint={t.settings.newRecoveryKeyHint}
          onclick={() => openPrivacy(() => (app.privacyDialog = 'recovery'))}
        />
        <SettingsRow
          label={t.settings.removeEncryption}
          hint={t.settings.removeEncryptionHint}
          onclick={() => openPrivacy(() => (app.privacyDialog = 'disable'))}
        />
      {:else if !app.encryptionSupported}
        <p class="px-3.5 py-3 text-xs leading-relaxed text-muted">
          {t.settings.needsSecureConnection}
        </p>
      {:else}
        <SettingsRow
          label={t.settings.protectWithPassword}
          hint={t.settings.protectHint}
          onclick={() => app.openEncryptionSetup()}
          disabled={app.busy}
        />
      {/if}
    </SettingsSection>

    <!-- Temporary: seven taps on the heading open the old-scores import (see legacy-scores.ts). -->
    <SettingsSection title={t.settings.appSection} taps={{ count: 7, onreach: () => (app.legacyScoresOpen = true) }}>
      {#if updates.supported}
        {#if updates.available && updates.latest}
          <div class="update-row flex items-center gap-3 rounded-t-[11px] px-3.5 py-3">
            <UpdateMark size="sm" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-text">{fmt(t.settings.versionReady, { version: updates.latest.version })}</span>
              <span class="block text-xs text-muted">{fmt(t.settings.released, { ago: timeAgo(new Date(updates.latest.published)) })}</span>
            </span>
            <button
              class="shrink-0 rounded-lg bg-text px-3 py-1.5 text-xs font-semibold text-ink transition-transform hover:[transform:scale(1.02)] active:[transform:scale(0.98)]"
              onclick={getUpdate}
            >
              {t.settings.getUpdate}
            </button>
          </div>
        {/if}

        <SettingsRow
          label={fmt(t.settings.installedVersionLabel, { version: updates.current })}
          hint={updateStatus || (updates.canCheck ? t.settings.installedVersion : t.settings.checkOpensBrowser)}
          hintClass={updates.status === 'failed' ? 'text-red-400/80' : 'text-muted'}
        >
          <button
            class="flex items-center gap-2 rounded-lg border border-slate px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-slate hover:text-text disabled:opacity-60"
            onclick={checkNow}
            disabled={updates.status === 'checking'}
          >
            {#if updates.canCheck}
              <svg class={updates.status === 'checking' ? 'animate-spin' : ''} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>
              {t.settings.checkNow}
            {:else}
              {t.settings.checkOnline}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>
            {/if}
          </button>
        </SettingsRow>

        {#if updates.canCheck}
          <SettingsRow
            label={t.settings.autoUpdateCheck}
            hint={t.settings.autoUpdateCheckHint}
          >
            <Switch checked={updates.enabled} label={t.settings.autoUpdateCheck} onchange={(on) => saveUpdatePref(updates.setEnabled(on))} />
          </SettingsRow>
        {/if}

        {#if !updates.canCheck || !updates.enabled}
          <SettingsRow
            label={t.settings.monthlyReminder}
            hint={updates.canCheck ? t.settings.monthlyReminderHint : t.settings.monthlyReminderOfflineHint}
          >
            <Switch checked={updates.reminders} label={t.settings.monthlyReminder} onchange={(on) => saveUpdatePref(updates.setReminders(on))} />
          </SettingsRow>
        {/if}
      {/if}

      {#if install.available}
        <SettingsRow
          label={t.settings.installApp}
          hint={installHint}
          onclick={installApp}
          trailing={install.platform ? 'external' : 'chevron'}
        />
      {/if}

      <SettingsRow
        label={t.settings.sourceCode}
        hint={SOURCE_REPO.label}
        href={SOURCE_REPO.url}
        onclick={() => void openExternal(SOURCE_REPO.url)}
      />
    </SettingsSection>

    <!-- Set apart from everything else, so it is never reached by accident. -->
    {#if app.vault}
      <SettingsSection title={t.settings.dangerZone}>
        <SettingsRow
          label={t.settings.deleteDiary}
          hint={device ? t.settings.deleteHintDevice : t.settings.deleteHintBrowser}
          tone="danger"
          onclick={() => (confirmForget = true)}
          disabled={app.busy}
        />
      </SettingsSection>
    {/if}
  </Modal>

  {#if spellcheckOpen}
    <SpellcheckDialog onclose={() => (spellcheckOpen = false)} />
  {/if}

  {#if dictionaryOpen}
    <DictionaryDialog onclose={() => (dictionaryOpen = false)} />
  {/if}

  {#if confirmForget}
    <ConfirmDialog
      title={t.settings.deleteConfirmTitle}
      confirmLabel={t.settings.deleteDiary}
      onconfirm={forget}
      oncancel={() => (confirmForget = false)}
      busy={app.busy}
      z="z-dialog"
    >
      {fmt(device ? t.settings.deleteConfirmDevice : t.settings.deleteConfirmBrowser, { count: app.entries.length })}
    </ConfirmDialog>
  {/if}
{/if}

<style>
  .update-row {
    background: linear-gradient(100deg, color-mix(in oklab, #f5b452 9%, transparent), transparent 70%);
  }
</style>
