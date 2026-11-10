<script lang="ts" generics="T extends string | number">
  /** A compact either/or control for two or three short choices, all visible at once. */
  let {
    value,
    options,
    onchange,
    label,
  }: {
    value: T;
    options: readonly { value: T; label: string }[];
    onchange: (value: T) => void;
    /** What is being chosen, for assistive tech. */
    label: string;
  } = $props();
</script>

<div class="inline-flex shrink-0 rounded-lg border border-slate bg-slate-soft p-0.5" role="group" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      class="rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors
        {option.value === value ? 'bg-slate text-text shadow-sm shadow-black/20' : 'text-muted hover:text-text'}"
      aria-pressed={option.value === value}
      onclick={() => onchange(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
