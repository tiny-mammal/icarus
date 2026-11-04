<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import { app } from '../lib/store.svelte';

  let dragHover = $state(false);

  // The two runtimes expose drops differently: Tauri delivers OS paths through
  // webview events, a plain browser delivers File objects through HTML5 DnD.
  const isDesktop = app.storageKind === 'folder';

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragHover = true;
  }

  function onDragLeave() {
    dragHover = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragHover = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) void app.openDroppedFile(file);
  }

  onMount(() => {
    if (!isDesktop) return;
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        const p = event.payload;
        if (p.type === 'enter' || p.type === 'over') {
          dragHover = true;
        } else if (p.type === 'leave') {
          dragHover = false;
        } else if (p.type === 'drop') {
          dragHover = false;
          const path = p.paths?.[0];
          if (path) app.openDroppedPath(path);
        }
      })
      .then((fn) => (unlisten = fn))
      .catch(() => {
        /* drag-drop simply unavailable; the button still works */
      });
    return () => unlisten?.();
  });
</script>

<div class="vignette relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6">
  <!-- Ambient breathing orb -->
  <div
    class="pointer-events-none absolute -top-40 h-[34rem] w-[34rem] rounded-full bg-slate/20 blur-3xl"
    in:fade={{ duration: 1200 }}
  ></div>

  <main class="relative flex w-full max-w-lg flex-col items-center text-center">
    <div in:fly={{ y: 14, duration: 700, delay: 100, easing: cubicOut }}>
      <div class="mx-auto mb-8 grid h-14 w-14 place-items-center rounded-full border border-faint">
        <span class="h-2.5 w-2.5 rounded-full bg-muted"></span>
      </div>
      <h1 class="text-3xl font-semibold tracking-tight text-text">Icarus Diary</h1>
      <p class="mt-3 text-sm leading-relaxed text-muted">
        A quiet, local-first place for your days.<br />
        {isDesktop
          ? 'Choose where your diary, drafts and settings will live.'
          : 'Start a new diary, or bring in one you already keep.'}
      </p>
    </div>

    <button
      class="mt-10 w-full rounded-xl border border-faint bg-slate-soft px-6 py-4 text-sm font-medium text-text transition-colors hover:bg-slate disabled:opacity-60"
      onclick={() => (isDesktop ? app.openVaultFolder() : app.startNewDiary())}
      disabled={app.busy}
      in:fly={{ y: 16, duration: 700, delay: 180, easing: cubicOut }}
    >
      {isDesktop ? 'Open or create diary folder' : 'Start a new diary'}
    </button>
    {#if isDesktop}
      <p class="mt-2 text-xs text-muted">Your diary, drafts and settings will be saved here.</p>
    {/if}

    <!-- Drop zone / primary action -->
    <button
      class="group mt-5 flex w-full flex-col items-center gap-4 rounded-2xl border border-dashed px-8 py-10 transition-all duration-300
        {dragHover
          ? 'scale-[1.01] border-muted bg-slate-soft'
          : 'border-faint hover:border-muted hover:bg-slate-soft/60'}"
      onclick={() => app.importVault()}
      ondragover={isDesktop ? undefined : onDragOver}
      ondragleave={isDesktop ? undefined : onDragLeave}
      ondrop={isDesktop ? undefined : onDrop}
      in:fly={{ y: 18, duration: 700, delay: 240, easing: cubicOut }}
    >
      <span
        class="grid h-12 w-12 place-items-center rounded-full border border-faint text-muted transition-all duration-300 group-hover:scale-105 group-hover:text-text"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
      </span>
      <span class="text-sm font-medium text-text">
        {dragHover
          ? 'Release to open'
          : isDesktop
            ? 'Import an existing diary'
            : 'Import a diary (.ics)'}
      </span>
      <span class="text-xs text-muted">
        {isDesktop
          ? 'Choose the file, then its new data folder'
          : app.storageKind === 'device'
            ? 'Tap to choose a .ics or .icarus file'
            : 'Drag & drop a file here, or click to browse'}
      </span>
    </button>

    <!-- What happens next: the protection choice. -->
    <p class="mt-7 flex items-center gap-2 text-xs text-muted" in:fade={{ duration: 600, delay: 420 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      Next, you'll choose whether to protect it with a password.
    </p>
  </main>
</div>
