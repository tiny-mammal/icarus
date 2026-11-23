<script lang="ts">
  import { app } from '../lib/store.svelte';
  import { install } from '../lib/install.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import Modal from './Modal.svelte';
  import Rich from './Rich.svelte';

  /**
   * How to install Icarus as a web app where there is no native build and the
   * browser has no install button of its own to hand over: the Share sheet on
   * iPhone and iPad, or the browser menu elsewhere.
   */

  const title = $derived(install.method === 'ios' ? t.app.installIosTitle : t.app.installTitle);

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
        <p>{t.app.installIosIntro}</p>
        <ol class="space-y-3">
          <li class="flex gap-3">{@render badge(1)}<span class="pt-0.5"><Rich message={t.app.installIosStepShare} slots={{ share: shareIcon, more: moreIcon }} /></span></li>
          <li class="flex gap-3">{@render badge(2)}<span class="pt-0.5"><Rich message={t.app.installIosStepAdd} /></span></li>
          <li class="flex gap-3">{@render badge(3)}<span class="pt-0.5"><Rich message={t.app.installIosStepConfirm} /></span></li>
        </ol>
      {:else}
        <p>{t.app.installIntro}</p>
        <ol class="space-y-3">
          <li class="flex gap-3">{@render badge(1)}<span class="pt-0.5"><Rich message={t.app.installStepMenu} slots={{ more: moreIcon }} /></span></li>
          <li class="flex gap-3">{@render badge(2)}<span class="pt-0.5"><Rich message={t.app.installStepChoose} /></span></li>
        </ol>
        <p class="text-xs">{t.app.installNotFound}</p>
      {/if}

      {#if install.method === 'ios' && app.entries.length > 0}
        <div class="rounded-lg border border-slate bg-slate-soft px-3.5 py-3">
          <p class="text-text">{t.app.installBringEntries}</p>
          <p class="mt-1 text-xs">
            {t.app.installBringEntriesHint}
          </p>
          <button
            class="mt-3 rounded-lg border border-faint bg-ink px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-slate"
            onclick={exportBackup}
            disabled={app.busy}
          >
            {t.app.exportBackup}
          </button>
        </div>
      {/if}
    </div>
  </Modal>
{/if}
