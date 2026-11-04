<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from './lib/store.svelte';
  import Welcome from './components/Welcome.svelte';
  import TopBar from './components/TopBar.svelte';
  import Calendar from './components/Calendar.svelte';
  import DayPane from './components/DayPane.svelte';
  import WriteButton from './components/WriteButton.svelte';
  import SettingsMenu from './components/SettingsMenu.svelte';
  import StatsModal from './components/StatsModal.svelte';
  import DraftDeleteDialog from './components/DraftDeleteDialog.svelte';
  import EntryDeleteDialog from './components/EntryDeleteDialog.svelte';
  import Toasts from './components/Toasts.svelte';
  import LockScreen from './components/LockScreen.svelte';
  import EncryptionSetup from './components/EncryptionSetup.svelte';
  import PrivacyDialog from './components/PrivacyDialog.svelte';
  import ExportDialog from './components/ExportDialog.svelte';
  import { watchIdle } from './lib/idle';
  import { isPlainShortcut } from './lib/keyboard';
  import { dismissBootSplash } from './lib/boot-splash';

  // The static splash in index.html covers the app until the first screen is
  // known; it is fixed-position, so uncovering it never shifts the layout.
  $effect(() => {
    if (app.ready) void dismissBootSplash();
  });

  // Auto-lock an encrypted diary after the chosen period of inactivity.
  $effect(() => {
    if (!app.encrypted || app.autoLockMinutes === 0) return;
    return watchIdle(window, app.autoLockMinutes * 60_000, () => void app.lock());
  });

  onMount(() => {
    app.init();

    // Global Escape closes the top-most layer (writing goes back to reading);
    // N starts writing from the calendar (an open day pane handles N itself,
    // dating the entry that day).
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'n' || e.key === 'N') && !e.shiftKey) {
        if (app.view !== 'main' || app.selectedKey || app.overlayOpen) return;
        if (!isPlainShortcut(e)) return;
        e.preventDefault();
        app.resumeWriting();
        return;
      }
      if (e.key !== 'Escape') return;
      if (app.statsOpen) app.statsOpen = false;
      else if (app.settingsOpen) app.settingsOpen = false;
      else if (app.editing) app.stopEditing();
      else if (app.selectedKey) app.closeDay();
    };
    window.addEventListener('keydown', onKey);

    // Last-chance draft flush when the window is hidden or about to close, so
    // an in-progress entry is never lost to a quit or a power cut. These web
    // handlers can't await, so they're a best-effort fallback.
    const flush = () => void app.flushDraftNow();
    const onVisibility = () => {
      if (!document.hidden) return;
      // Locking flushes the draft (encrypted) first.
      if (app.encrypted && app.lockWhenHidden) void app.lock();
      else flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);

    // The reliable path under Tauri: intercept the window close, finish the
    // (async) flush, then actually close. If the folder is unavailable, ask
    // before discarding the unsaved editor content.
    let unlistenClose: (() => void) | undefined;
    void (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        unlistenClose = await win.onCloseRequested(async (event) => {
          event.preventDefault();
          if (await app.flushDraftNow()) {
            await win.destroy();
            return;
          }
          const { confirm } = await import('@tauri-apps/plugin-dialog');
          if (await confirm(
            'The current draft could not be saved to the diary folder. Quit and discard the unsaved changes?',
            { title: 'Unsaved draft', kind: 'warning' },
          )) await win.destroy();
        });
      } catch {
        // Not running under Tauri (e.g. `pnpm dev`) — rely on the web handlers.
      }
    })();

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      unlistenClose?.();
    };
  });
</script>

<!-- Nothing renders until boot settles, so the wrong screen never flashes. -->
{#if app.ready}
  {#if app.view === 'welcome'}
    <Welcome />
  {:else if app.view === 'locked'}
    <LockScreen />
  {:else}
    <TopBar />
    <!-- Main stage: calendar with the day pane (reading and writing) over it. -->
    <main class="relative min-h-0 flex-1 overflow-hidden">
      <Calendar />
      <DayPane />
    </main>
    <WriteButton variant="floating" />
    <SettingsMenu />
    <StatsModal />
    {#if app.privacyDialog}<PrivacyDialog />{/if}
    {#if app.exportOpen}<ExportDialog />{/if}
  {/if}
{/if}

<!-- Also offered from Welcome and the lock screen, for new and imported diaries. -->
{#if app.encryptionSetupOpen}
  <!-- Keyed per run: reopening during the close animation must not reuse its state. -->
  {#key app.encryptionSetupRun}<EncryptionSetup />{/key}
{/if}

<DraftDeleteDialog />
<EntryDeleteDialog />
<Toasts />
