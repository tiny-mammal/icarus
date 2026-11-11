<script lang="ts">
  import type { Snippet } from 'svelte';

  /** One headline figure of the statistics: a small label, the value, a line of context. */
  let {
    label,
    value,
    unit,
    sub,
    small = false,
    color,
    header,
  }: {
    label: string;
    value: string;
    /** Set against the value in a quieter tone, e.g. "days". */
    unit?: string;
    sub: string;
    /** A value that is text rather than a number, set smaller so it fits. */
    small?: boolean;
    /** Tints the value, for something worth lighting up. */
    color?: string;
    /** An optional control in place of the plain label. */
    header?: Snippet;
  } = $props();
</script>

<div class="h-full min-w-0 rounded-xl border border-slate bg-slate-soft px-3.5 py-3" role="group" aria-label={label}>
  {#if header}
    {@render header()}
  {:else}
    <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">{label}</p>
  {/if}
  <p
    class="mt-1 truncate font-semibold tracking-tight tabular-nums text-text {small ? 'text-sm' : 'text-lg'}"
    style:color
  >
    {value}
    {#if unit}<span class="text-xs font-normal text-muted">{unit}</span>{/if}
  </p>
  <p class="mt-0.5 truncate text-[0.7rem] text-muted">{sub}</p>
</div>
