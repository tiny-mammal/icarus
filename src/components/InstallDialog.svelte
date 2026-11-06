<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { install } from '../lib/install.svelte';
  import Modal from './Modal.svelte';

  /**
   * How to install Icarus as a web app where there is no native build and the
   * browser has no install button of its own to hand over: the Share sheet on
   * iPhone and iPad, or the browser menu elsewhere.
   */

  const title = $derived(install.method === 'ios' ? 'Add to Home Screen' : 'Install the app');

  function close() {
    install.helpOpen = false;
  }

  /** Apple's installed web apps keep their own storage, so carry the diary over by backup. */
  function exportBackup() {
    close();
    if (app.encrypted) app.exportOpen = true;
    else void app.exportVault();
  }
</script>

{#snippet shareIcon()}
  <svg class="relative -top-px inline-block align-middle text-text" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="m8 7 4-4 4 4"/><path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2"/></svg>
{/snippet}

{#snippet moreIcon()}
  <svg class="relative -top-px inline-block align-middle text-text" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
{/snippet}

{#snippet badge(n: number)}
  <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-faint text-xs font-medium tabular-nums text-text" aria-hidden="true">{n}</span>
{/snippet}

{#if install.helpOpen}
  <Modal {title} onclose={close} width="sm:max-w-md">
    <div class="space-y-5 text-sm leading-relaxed text-muted">
      {#if install.method === 'ios'}
        <p>
          Icarus will open full screen from your Home Screen, like any other app, and work offline.
          Safari can also clear a website's data if you don't visit it for a while; the Home Screen
          app keeps your diary.
        </p>
        <ol class="space-y-3">
          <li class="flex gap-3">{@render badge(1)}<span class="pt-0.5">Tap the Share button {@render shareIcon()} in the browser. If you don't see it, tap {@render moreIcon()} first.</span></li>
          <li class="flex gap-3">{@render badge(2)}<span class="pt-0.5">Choose <span class="font-medium text-text">Add to Home Screen</span>. You may need to scroll down or tap <span class="text-text">View More</span> to find it.</span></li>
          <li class="flex gap-3">{@render badge(3)}<span class="pt-0.5">Tap <span class="font-medium text-text">Add</span>. Icarus appears on your Home Screen.</span></li>
        </ol>
      {:else}
        <p>Icarus can open in its own window, like any other app, and work offline.</p>
        <ol class="space-y-3">
          <li class="flex gap-3">{@render badge(1)}<span class="pt-0.5">Open your browser's menu, usually {@render moreIcon()} or ☰ next to the address bar.</span></li>
          <li class="flex gap-3">{@render badge(2)}<span class="pt-0.5">Choose <span class="font-medium text-text">Install app</span>, <span class="font-medium text-text">Install Icarus</span> or <span class="font-medium text-text">Add to Home screen</span>.</span></li>
        </ol>
        <p class="text-xs">Don't see it? Chrome, Edge and Safari can all install Icarus.</p>
      {/if}

      {#if install.method === 'ios' && app.entries.length > 0}
        <div class="rounded-lg border border-slate bg-slate-soft px-3.5 py-3">
          <p class="text-text">Bring your entries with you</p>
          <p class="mt-1 text-xs">
            The installed app keeps its own diary, separate from the one in
            this browser. Export a backup now, then import it
            the first time you open the app.
          </p>
          <button
            class="mt-3 rounded-lg border border-faint bg-ink px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-slate"
            onclick={exportBackup}
            disabled={app.busy}
          >
            Export backup
          </button>
        </div>
      {/if}
    </div>
  </Modal>
{/if}
