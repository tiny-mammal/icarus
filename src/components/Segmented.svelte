<script lang="ts" generics="T extends string | number">
  /**
   * A compact either/or control for two or three short choices, all visible at
   * once. The highlight slides to the chosen option; give `position` (a
   * fractional option index) to drive it from elsewhere, e.g. a pager being
   * dragged, so the two move as one.
   */
  let {
    value,
    options,
    onchange,
    label,
    position,
  }: {
    value: T;
    options: readonly { value: T; label: string }[];
    onchange: (value: T) => void;
    /** What is being chosen, for assistive tech. */
    label: string;
    /** Where the highlight sits, in options (1.5 is halfway between the second and third). */
    position?: number;
  } = $props();

  let group = $state<HTMLElement | null>(null);
  let buttons = $state<HTMLElement[]>([]);
  let rects = $state<{ left: number; width: number }[]>([]);

  // The options differ in width, so the highlight is measured from them.
  $effect(() => {
    if (!group) return;
    const els = buttons.slice(0, options.length);
    const measure = () => (rects = els.map((el) => ({ left: el.offsetLeft, width: el.offsetWidth })));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(group);
    els.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  });

  const chosen = $derived(options.findIndex((option) => option.value === value));
  const at = $derived(Math.min(Math.max(position ?? chosen, 0), options.length - 1));
  const lit = $derived(Math.round(at));
  const pill = $derived.by(() => {
    const from = rects[Math.floor(at)];
    const to = rects[Math.ceil(at)];
    if (!from || !to) return null;
    const f = at - Math.floor(at);
    return { left: from.left + (to.left - from.left) * f, width: from.width + (to.width - from.width) * f };
  });
</script>

<div
  bind:this={group}
  class="relative inline-flex shrink-0 rounded-lg border border-slate bg-slate-soft p-0.5"
  role="group"
  aria-label={label}
>
  {#if pill}
    <span
      class="pointer-events-none absolute inset-y-0.5 left-0 rounded-md bg-slate shadow-sm shadow-black/20 {position === undefined ? 'transition-[transform,width] duration-200 ease-out motion-reduce:transition-none' : ''}"
      style:width="{pill.width}px"
      style:transform="translateX({pill.left}px)"
      aria-hidden="true"
    ></span>
  {/if}
  {#each options as option, i (option.value)}
    <button
      bind:this={buttons[i]}
      type="button"
      class="relative rounded-md px-2.5 py-1 text-xs font-medium first-letter:uppercase transition-colors
        {i === lit ? 'text-text' : 'text-muted hover:text-text'}"
      aria-pressed={option.value === value}
      onclick={() => onchange(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
