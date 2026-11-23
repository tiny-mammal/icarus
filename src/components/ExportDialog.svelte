<script lang="ts">
  import BusyLabel from './BusyLabel.svelte';
  import Modal from './Modal.svelte';
  import { app } from '../lib/store.svelte';
  import { t } from '../lib/i18n/index.svelte';

  /**
   * Backup format choice for an encrypted diary. The encrypted backup is the
   * default; a plain `.ics` needs an explicit, clearly-labelled second step.
   */
  let confirmPlain = $state(false);
  /** Which export is running, so only its button shows the progress dots. */
  let running = $state<'encrypted' | 'plain' | null>(null);

  async function run(format: 'encrypted' | 'plain') {
    running = format;
    await app.exportVault(format);
    running = null;
  }
</script>

<Modal title={t.privacy.exportBackup} onclose={() => (app.exportOpen = false)}>
  <div class="space-y-2">
    <button
      class="flex w-full flex-col rounded-lg border border-faint bg-slate-soft px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate disabled:opacity-60"
      onclick={() => run('encrypted')}
      disabled={app.busy}
    >
      <span class="font-medium"
        ><BusyLabel busy={running === 'encrypted'}>{t.privacy.exportEncrypted}</BusyLabel></span
      >
      <span class="text-xs text-muted">{t.privacy.exportEncryptedHint}</span>
    </button>
    {#if !confirmPlain}
      <button
        class="flex w-full flex-col rounded-lg border border-slate px-3.5 py-3 text-left text-sm text-text transition-colors hover:bg-slate"
        onclick={() => (confirmPlain = true)}
      >
        <span class="font-medium">{t.privacy.exportPlain}</span>
        <span class="text-xs text-muted">{t.privacy.exportPlainHint}</span>
      </button>
    {:else}
      <div class="rounded-lg border border-amber-300/30 bg-amber-300/5 px-3.5 py-3">
        <p class="text-sm leading-relaxed text-amber-200/90">
          {t.privacy.exportPlainWarning}
        </p>
        <div class="mt-3 flex justify-end gap-2">
          <button
            class="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-slate hover:text-text"
            onclick={() => (confirmPlain = false)}
          >
            {t.common.cancel}
          </button>
          <button
            class="rounded-lg border border-amber-300/40 px-3 py-1.5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/10 disabled:opacity-60"
            onclick={() => run('plain')}
            disabled={app.busy}
          >
            <BusyLabel busy={running === 'plain'}>{t.privacy.exportPlainConfirm}</BusyLabel>
          </button>
        </div>
      </div>
    {/if}
  </div>
</Modal>
