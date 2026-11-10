<script lang="ts">
  /** An accessible on/off switch. */
  let {
    checked,
    label,
    onchange,
    disabled = false,
  }: {
    checked: boolean;
    label: string;
    onchange: (checked: boolean) => void;
    disabled?: boolean;
  } = $props();
</script>

<!--
  The knob is placed with flex centering and a margin rather than transforms:
  Tailwind 4's translate utilities need the CSS `translate` property, which
  older Android WebViews ignore, leaving the knob hanging off the track.
-->
<button
  class="inline-flex h-6 w-11 shrink-0 items-center rounded-full border px-[3px] transition-colors
    {checked
      ? 'border-faint bg-text'
      : 'border-slate bg-slate-soft hover:bg-slate'}"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={() => onchange(!checked)}
>
  <span
    class="h-4 w-4 rounded-full transition-[margin,background-color]
      {checked ? 'ml-5 bg-ink' : 'ml-0 bg-muted'}"
  ></span>
</button>
