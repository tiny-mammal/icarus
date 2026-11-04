<script lang="ts">
  import type { Snippet } from 'svelte';
  import Modal from './Modal.svelte';

  /**
   * A destructive confirmation ("Delete entry?") on the shared modal shell:
   * a message, Cancel, and a red confirm button. On phones the buttons span
   * the sheet so both are easy to hit.
   */
  let {
    title,
    confirmLabel,
    onconfirm,
    oncancel,
    busy = false,
    z = 'z-[70]',
    children,
  }: {
    title: string;
    confirmLabel: string;
    onconfirm: () => void;
    oncancel: () => void;
    /** Disable the confirm button while the action runs. */
    busy?: boolean;
    z?: string;
    children: Snippet;
  } = $props();
</script>

<Modal {title} onclose={oncancel} width="sm:max-w-xs" {z}>
  <p class="text-sm text-muted">{@render children()}</p>
  <div class="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
    <button
      class="rounded-lg border border-slate px-3.5 py-2.5 text-sm text-muted transition-colors hover:bg-slate hover:text-text sm:border-transparent sm:py-2"
      onclick={oncancel}
    >
      Cancel
    </button>
    <button
      class="rounded-lg bg-red-500 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500/90 disabled:opacity-60 sm:py-2"
      onclick={onconfirm}
      disabled={busy}
    >
      {confirmLabel}
    </button>
  </div>
</Modal>
