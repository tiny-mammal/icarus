<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { app } from './lib/store.svelte';
  import Welcome from './components/Welcome.svelte';
  import TopBar from './components/TopBar.svelte';
  import Calendar from './components/Calendar.svelte';
  import DayPane from './components/DayPane.svelte';
  import WritingDock from './components/WritingDock.svelte';
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

  // Auto-lock an encrypted diary after the chosen period of inactivity.
  $effect(() => {
    if (!app.encrypted || app.autoLockMinutes === 0) return;
    return watchIdle(window, app.autoLockMinutes * 60_000, () => void app.lock());
  });

  onMount(() => {
    app.init();

    // Global Escape closes the top-most overlay.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (app.statsOpen) app.statsOpen = false;
      else if (app.settingsOpen) app.settingsOpen = false;
      else if (app.dockExpanded) app.collapseDock();
      else if (app.readerFullscreen) app.readerFullscreen = false;
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

{#if !app.ready}
  <!-- Quiet boot splash to avoid a flash of the wrong screen. -->
  <div class="grid h-full place-items-center bg-ink" out:fade={{ duration: 200 }}>
    <span class="h-2 w-2 animate-ping rounded-full bg-muted"></span>
  </div>
{:else if app.view === 'welcome'}
  <Welcome />
{:else if app.view === 'locked'}
  <LockScreen />
{:else}
  <TopBar />
  <!-- Main stage: calendar with the day pane sliding over it. -->
  <main class="relative min-h-0 flex-1 overflow-hidden pb-16">
    <Calendar />
    <DayPane />
  </main>
  <WritingDock />
  <SettingsMenu />
  <StatsModal />
  {#if app.privacyDialog}<PrivacyDialog />{/if}
  {#if app.exportOpen}<ExportDialog />{/if}
{/if}

<!-- Also offered from Welcome and the lock screen, for new and imported diaries. -->
{#if app.encryptionSetupOpen}
  <!-- Keyed per run: reopening during the close animation must not reuse its state. -->
  {#key app.encryptionSetupRun}<EncryptionSetup />{/key}
{/if}

<DraftDeleteDialog />
<EntryDeleteDialog />
<Toasts />
