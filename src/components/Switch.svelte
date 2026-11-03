<script lang="ts">
  /** An accessible on/off switch. */
  let {
    checked,
    label,
    onchange,
  }: {
    checked: boolean;
    label: string;
    onchange: (checked: boolean) => void;
  } = $props();
</script>

<button
  class="relative h-6 w-11 shrink-0 rounded-full border transition-colors
    {checked
      ? 'border-faint bg-text'
      : 'border-slate bg-slate-soft hover:bg-slate'}"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  onclick={() => onchange(!checked)}
>
  <span
    class="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all
      {checked ? 'left-[1.45rem] bg-ink' : 'left-1 bg-muted'}"
  ></span>
</button>
