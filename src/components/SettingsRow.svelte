<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * One line of Settings: what it is on the left, its control on the right.
   * With `onclick` the whole row is the control (it opens or does something)
   * and says so with a trailing mark; with `href` it is a link as well.
   */
  let {
    label,
    hint,
    onclick,
    href,
    trailing = href ? 'external' : 'chevron',
    tone = 'default',
    disabled = false,
    hintClass = 'text-muted',
    children,
  }: {
    label: string;
    hint?: string;
    onclick?: () => void;
    href?: string;
    /** The mark closing a clickable row: it opens a step, or leaves the app. */
    trailing?: 'chevron' | 'external' | 'none';
    tone?: 'default' | 'danger';
    /** Dim the row and block a clickable one, while its setting doesn't apply. */
    disabled?: boolean;
    hintClass?: string;
    /** The control: a switch, a select, a button… */
    children?: Snippet;
  } = $props();

  const danger = $derived(tone === 'danger');
  const layout = 'flex min-h-[3.25rem] w-full items-center gap-3 px-3.5 py-2.5 text-left first:rounded-t-[11px] last:rounded-b-[11px]';
  const interactive = $derived(
    `transition-colors disabled:opacity-50 ${danger ? 'hover:bg-red-400/10' : 'hover:bg-slate'}`,
  );
</script>

{#snippet content()}
  <span class="min-w-0 flex-1">
    <span class="block text-sm {danger ? 'font-medium text-red-400' : 'text-text'}">{label}</span>
    {#if hint}
      <span class="mt-0.5 block text-xs {danger ? 'text-red-400/70' : hintClass}">{hint}</span>
    {/if}
  </span>
  {#if children}
    <span class="flex shrink-0 items-center">{@render children()}</span>
  {/if}
  {#if (onclick || href) && trailing !== 'none'}
    <svg class="shrink-0 {danger ? 'text-red-400/70' : 'text-muted'}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {#if trailing === 'external'}
        <path d="M7 17 17 7" /><path d="M8 7h9v9" />
      {:else}
        <path d="m9 6 6 6-6 6" />
      {/if}
    </svg>
  {/if}
{/snippet}

{#if href}
  <a
    class="{layout} {interactive}"
    {href}
    target="_blank"
    rel="noopener noreferrer"
    onclick={(e) => {
      if (!onclick) return;
      e.preventDefault();
      onclick();
    }}
  >
    {@render content()}
  </a>
{:else if onclick}
  <button type="button" class="{layout} {interactive}" {onclick} {disabled}>
    {@render content()}
  </button>
{:else}
  <div class="{layout} transition-opacity {disabled ? 'opacity-45' : ''}">
    {@render content()}
  </div>
{/if}
