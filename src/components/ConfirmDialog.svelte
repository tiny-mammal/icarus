<script lang="ts">
  import type { Snippet } from 'svelte';
  import BusyLabel from './BusyLabel.svelte';
  import Modal from './Modal.svelte';
  import { t } from '../lib/i18n/index.svelte';

  /**
   * A destructive confirmation ("Delete entry?") on the shared modal shell:
   * a message, Cancel, and a red confirm button. On phones the buttons span
   * the sheet so both are easy to hit. The message is either the children or
   * a catalog sentence with a `{subject}` placeholder, whose value (an entry's
   * title, say) is shown emphasised wherever the language puts it.
   */
  let {
    title,
    confirmLabel,
    onconfirm,
    oncancel,
    busy = false,
    z = 'z-confirm',
    message,
    subject = '',
    children,
  }: {
    title: string;
    confirmLabel: string;
    onconfirm: () => void;
    oncancel: () => void;
    /** Disable the confirm button while the action runs. */
    busy?: boolean;
    z?: string;
    /** Sentence containing `{subject}`; used instead of `children`. */
    message?: string;
    subject?: string;
    children?: Snippet;
  } = $props();

  const parts = $derived(message?.split('{subject}') ?? []);
</script>

<Modal {title} onclose={oncancel} width="sm:max-w-xs" {z}>
  <p class="text-sm text-muted">
    {#if message}
      {parts[0]}<span class="text-text">{subject}</span>{parts[1] ?? ''}
    {:else}
      {@render children?.()}
    {/if}
  </p>
  <div class="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
    <button
      class="rounded-lg border border-slate px-3.5 py-2.5 text-sm text-muted transition-colors hover:bg-slate hover:text-text sm:border-transparent sm:py-2"
      onclick={oncancel}
    >
      {t.common.cancel}
    </button>
    <button
      class="rounded-lg btn-danger px-3.5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 sm:py-2"
      onclick={onconfirm}
      disabled={busy}
    >
      <BusyLabel {busy}>{confirmLabel}</BusyLabel>
    </button>
  </div>
</Modal>
