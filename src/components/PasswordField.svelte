<script lang="ts">
  import { tooltip } from '../lib/tooltip';
  import type { HTMLInputAttributes } from 'svelte/elements';

  /** A labelled password input with a show/hide toggle. */
  let {
    label,
    value = $bindable(''),
    autocomplete = 'current-password',
    autofocus = false,
    invalid = false,
    describedby,
  }: {
    label: string;
    value?: string;
    autocomplete?: HTMLInputAttributes['autocomplete'];
    autofocus?: boolean;
    invalid?: boolean;
    describedby?: string;
  } = $props();

  let visible = $state(false);
  let input = $state<HTMLInputElement | null>(null);
  const id = `password-${Math.random().toString(36).slice(2)}`;

  $effect(() => {
    if (autofocus) input?.focus();
  });
</script>

<div>
  <label for={id} class="mb-1.5 block text-xs font-medium text-muted">{label}</label>
  <div
    class="flex items-center rounded-lg border bg-slate-soft pr-1 transition-colors focus-within:border-faint
      {invalid ? 'border-red-400/60' : 'border-slate'}"
  >
    <input
      bind:this={input}
      bind:value
      {id}
      type={visible ? 'text' : 'password'}
      {autocomplete}
      aria-invalid={invalid}
      aria-describedby={describedby}
      spellcheck="false"
      autocapitalize="off"
      class="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none"
    />
    <button
      type="button"
      class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-slate hover:text-text"
      aria-label={visible ? 'Hide password' : 'Show password'}
      use:tooltip={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      onclick={() => (visible = !visible)}
    >
      {#if visible}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/></svg>
      {:else}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      {/if}
    </button>
  </div>
</div>
