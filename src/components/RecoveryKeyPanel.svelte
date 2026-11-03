<script lang="ts">
  import { downloadText } from '../lib/download';

  /**
   * Shows a freshly generated recovery key once, with copy/download helpers,
   * and asks the user to type its last group back — proof they kept it before
   * anything is written.
   */
  let {
    recoveryKey,
    confirmed = $bindable(false),
  }: {
    recoveryKey: string;
    confirmed?: boolean;
  } = $props();

  let typed = $state('');
  let copied = $state(false);
  const groups = $derived(recoveryKey.split('-'));
  const lastGroup = $derived(groups.at(-1) ?? '');
  const inputId = `recovery-check-${Math.random().toString(36).slice(2)}`;

  $effect(() => {
    confirmed = typed.trim().toUpperCase() === lastGroup;
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }

  function download() {
    const text = [
      'Icarus Diary recovery key',
      '',
      recoveryKey,
      '',
      'Keep this somewhere safe and separate from your diary.',
      'Anyone with this key can open your diary.',
      '',
    ].join('\n');
    downloadText(text, 'icarus-recovery-key.txt', 'text/plain');
  }
</script>

<div class="space-y-4">
  <div class="rounded-lg border border-faint bg-ink px-4 py-3">
    <p
      class="grid select-text grid-cols-4 gap-x-3 gap-y-1.5 text-center font-mono text-[0.95rem] tracking-widest text-text"
      aria-label="Recovery key {recoveryKey}"
      data-testid="recovery-key"
      data-key={recoveryKey}
    >
      {#each groups as group, i (i)}<span>{group}</span>{/each}
    </p>
  </div>
  <div class="grid grid-cols-2 gap-2">
    <button
      type="button"
      class="rounded-lg border border-slate px-3 py-2 text-sm text-text transition-colors hover:bg-slate"
      onclick={copy}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
    <button
      type="button"
      class="rounded-lg border border-slate px-3 py-2 text-sm text-text transition-colors hover:bg-slate"
      onclick={download}
    >
      Download .txt
    </button>
  </div>
  <div>
    <label for={inputId} class="mb-1.5 block text-xs font-medium text-muted">
      To confirm you saved it, type its last four characters
    </label>
    <input
      id={inputId}
      bind:value={typed}
      maxlength="4"
      autocomplete="off"
      spellcheck="false"
      autocapitalize="characters"
      class="w-28 rounded-lg border border-slate bg-slate-soft px-3 py-2 font-mono text-sm uppercase tracking-widest text-text focus:border-faint focus:outline-none"
    />
  </div>
</div>
