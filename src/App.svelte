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
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import ReplaceDiaryDialog from './components/ReplaceDiaryDialog.svelte';
  import Toasts from './components/Toasts.svelte';
  import LockScreen from './components/LockScreen.svelte';
  import EncryptionSetup from './components/EncryptionSetup.svelte';
  import PrivacyDialog from './components/PrivacyDialog.svelte';
  import ExportDialog from './components/ExportDialog.svelte';
  import InstallDialog from './components/InstallDialog.svelte';
  import UpdateNotice from './components/UpdateNotice.svelte';
  import { watchIdle } from './lib/idle';
  import { isPlainShortcut } from './lib/keyboard';
  import { dismissBootSplash } from './lib/boot-splash';
  import { gestureLog } from './lib/gesture-log';
  import { syncBackButton, layerOpen } from './lib/back-button.svelte';

  // Development only (`?debug=gestures`): the gesture recorder, loaded on demand.
  const gestureRecorder =
    import.meta.env.DEV && gestureLog.enabled ? import('./components/GestureRecorder.svelte') : null;

  // Set when a window close was refused because the draft could not be saved:
  // the in-app prompt calls it to quit anyway.
  let discardAndQuit = $state<(() => void) | null>(null);

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

    // Back closes the open dialog, search, editor or day instead of the app.
    const stopBack = syncBackButton(() => layerOpen() || app.overlayOpen || app.selectedKey !== null);

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
      else if (app.editing) app.closeEditor();
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
    // (async) flush, then actually close. If the draft cannot be saved, ask
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
          discardAndQuit = () => void win.destroy();
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
      stopBack();
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
    <!-- Main stage: calendar with the day pane (reading and writing) over it.
         Isolated so nothing inside it, however high its z-index, can cover the
         top bar's popovers (search results, drafts). -->
    <main class="relative isolate min-h-0 flex-1 overflow-hidden">
      <Calendar />
      <DayPane />
    </main>
    <WriteButton variant="floating" />
    <SettingsMenu />
    <StatsModal />
    {#if app.privacyDialog}<PrivacyDialog />{/if}
    {#if app.exportOpen}<ExportDialog />{/if}
    <InstallDialog />
    <UpdateNotice />
  {/if}
{/if}

<!-- Also offered from Welcome and the lock screen, for new and imported diaries. -->
{#if app.encryptionSetupOpen}
  <!-- Keyed per run: reopening during the close animation must not reuse its state. -->
  {#key app.encryptionSetupRun}<EncryptionSetup />{/key}
{/if}

<DraftDeleteDialog />
{#if discardAndQuit}
  <ConfirmDialog
    title="Unsaved draft"
    confirmLabel="Quit anyway"
    onconfirm={discardAndQuit}
    oncancel={() => (discardAndQuit = null)}
  >
    The current draft could not be saved to the diary folder. Quitting now discards the unsaved
    changes.
  </ConfirmDialog>
{/if}
<EntryDeleteDialog />
<ReplaceDiaryDialog />
<Toasts />

{#if gestureRecorder}
  {#await gestureRecorder then { default: GestureRecorder }}<GestureRecorder />{/await}
{/if}
