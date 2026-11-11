<script lang="ts">
  /** One headline figure of the statistics: a small label, the value, a line of context. */
  let {
    label,
    value,
    unit,
    sub,
    small = false,
    accent = false,
  }: {
    label: string;
    value: string;
    /** Set against the value in a quieter tone, e.g. "days". */
    unit?: string;
    sub: string;
    /** A value that is text rather than a number, set smaller so it fits. */
    small?: boolean;
    /** Lights the value, for something that is happening right now. */
    accent?: boolean;
  } = $props();
</script>

<div class="min-w-0 rounded-xl border border-slate bg-slate-soft px-3.5 py-3">
  <p class="text-[0.65rem] font-medium tracking-wider text-muted uppercase">{label}</p>
  <p
    class="mt-1 truncate font-semibold tracking-tight tabular-nums {small ? 'text-sm' : 'text-lg'}
      {accent ? 'text-sun' : 'text-text'}"
  >
    {value}{#if unit}<span class="ml-1 text-xs font-normal text-muted">{unit}</span>{/if}
  </p>
  <p class="mt-0.5 truncate text-[0.7rem] text-muted">{sub}</p>
</div>
