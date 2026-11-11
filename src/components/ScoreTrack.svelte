<script lang="ts">
  import { isBestScore, sunColor } from '../lib/sun';
  import { selectionHaptic } from '../lib/haptics';

  /**
   * The day's score, 1 to `scale`, as a track that fills with light up to it,
   * like a sunrise, with the chosen number glowing as the sun. Both take the
   * sun's colour for the score: dusk for a bad day, noon for a great one, and
   * every colour, moving, for the best. Tap a number, or drag the sun along
   * the track with a finger or the mouse; tapping the chosen number again
   * clears the score. Arrow keys move along it.
   */
  let {
    value,
    scale,
    haptics,
    onchange,
  }: {
    value: number | null;
    scale: number;
    haptics: boolean;
    onchange: (value: number | null) => void;
  } = $props();

  const steps = $derived(Array.from({ length: scale }, (_, i) => i + 1));
  // The number under the mouse, or under a drag, previews its score.
  let preview = $state<number | null>(null);
  const shown = $derived(preview ?? value);
  let group = $state<HTMLElement | null>(null);

  // --- dragging the sun -----------------------------------------------------
  /** Pixels a press must travel before it counts as a drag rather than a tap. */
  const DRAG_SLOP = 6;
  let press: { id: number; x: number; step: number } | null = null;
  let dragging = $state(false);
  // A drag ends in a click on whatever number it was let go over: ignore it.
  let swallowClick = false;
  // While dragging, the sun sits where the pointer is.
  const sunAt = $derived(dragging ? preview : value);

  /** The number under horizontal position `x`. */
  function stepAt(x: number): number {
    const box = group!.getBoundingClientRect();
    return Math.min(scale, Math.max(1, Math.floor(((x - box.left) / box.width) * scale) + 1));
  }

  function onpointerdown(e: PointerEvent) {
    if (e.button !== 0) return;
    press = { id: e.pointerId, x: e.clientX, step: stepAt(e.clientX) };
  }

  function previewStep(e: PointerEvent) {
    const step = stepAt(e.clientX);
    if (press && step !== press.step) {
      press.step = step;
      if (haptics && e.pointerType === 'touch') void selectionHaptic();
    }
    preview = step;
  }

  function onpointermove(e: PointerEvent) {
    if (!press || e.pointerId !== press.id) return;
    if (!dragging) {
      if (Math.abs(e.clientX - press.x) < DRAG_SLOP) return;
      dragging = true;
      group?.setPointerCapture(e.pointerId);
    }
    previewStep(e);
  }

  function onpointerup(e: PointerEvent) {
    if (!press || e.pointerId !== press.id) return;
    if (!dragging) {
      press = null;
      return;
    }
    previewStep(e);
    press = null;
    dragging = false;
    swallowClick = true;
    setTimeout(() => (swallowClick = false));
    const step = stepAt(e.clientX);
    preview = null;
    if (step !== value) onchange(step);
  }

  function onpointercancel() {
    press = null;
    dragging = false;
    preview = null;
  }
  // The best score lights the whole track up in every colour.
  const glowing = $derived(shown !== null && isBestScore({ value: shown, scale }));

  function onkeydown(e: KeyboardEvent) {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.min(scale, Math.max(1, (value ?? (delta > 0 ? 0 : scale + 1)) + delta));
    onchange(next);
    group?.querySelectorAll<HTMLElement>('[role="radio"]')[next - 1]?.focus();
  }
</script>

<div
  bind:this={group}
  class="relative h-10 overflow-hidden rounded-full border border-slate bg-slate-soft [touch-action:pan-y] sm:h-[1.875rem]
    {glowing ? 'rainbow-halo' : ''} {dragging ? 'cursor-grabbing' : ''}"
  role="radiogroup"
  aria-label="Score"
  tabindex="-1"
  {onkeydown}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  {onpointercancel}
  onpointerleave={() => {
    if (!dragging) preview = null;
  }}
>
  <div
    class="fill absolute inset-y-0 left-0 overflow-hidden rounded-full
      {dragging ? 'dragging' : preview !== null && preview !== value ? 'opacity-60' : ''}"
    style:width="{shown ? (shown / scale) * 100 : 0}%"
    style:background={shown && !glowing
      ? `linear-gradient(90deg, ${sunColor({ value: shown, scale }, 0.18)}, ${sunColor({ value: shown, scale }, 0.7)})`
      : undefined}
    aria-hidden="true"
  >
    {#if glowing}
      <span class="rainbow-slide absolute inset-y-0 left-0 opacity-90"></span>
      <span class="rainbow-shine absolute inset-y-0 left-0"></span>
    {/if}
  </div>
  <div class="absolute inset-0 flex">
    {#each steps as step (step)}
      {@const chosen = value === step}
      {@const sun = sunAt === step}
      {@const best = sun && isBestScore({ value: step, scale })}
      <button
        type="button"
        role="radio"
        aria-checked={chosen}
        aria-label="{step} of {scale}"
        tabindex={chosen || (value === null && step === 1) ? 0 : -1}
        class="group grid min-w-0 flex-1 place-items-center text-xs tabular-nums focus:outline-none
          {sun ? 'font-bold text-ink' : glowing ? 'on-rainbow font-semibold text-text' : shown !== null && step < shown ? 'text-text' : 'text-muted hover:text-text'}"
        onpointerenter={(e) => {
          if (e.pointerType === 'mouse' && !dragging) preview = step;
        }}
        onclick={() => {
          if (swallowClick) return;
          preview = null;
          onchange(chosen ? null : step);
          if (haptics) void selectionHaptic();
        }}
      >
        <span
          class="sun relative grid h-7 w-7 place-items-center rounded-full sm:h-6 sm:w-6 group-focus-visible:ring-1 group-focus-visible:ring-muted
            {sun ? 'cursor-grab' : ''} {sun && dragging ? '[transform:scale(1.15)]' : ''}"
          style:background-color={sun ? sunColor({ value: step, scale }) : undefined}
          style:box-shadow={best
            ? '0 0 0 2px #fff, 0 0 16px rgba(255, 255, 255, 0.6)'
            : sun
              ? `0 0 14px ${sunColor({ value: step, scale }, 0.6)}`
              : undefined}
        >
          {#if best}<span class="rainbow-spin absolute inset-0 rounded-full" aria-hidden="true"></span>{/if}
          <span class="relative">{step}</span>
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .fill {
    transition:
      width 250ms var(--ease-glide),
      opacity 160ms var(--ease-glide);
  }
  /* Follow a drag closely. */
  .fill.dragging {
    transition-duration: 90ms;
  }
  /* The chosen number, coloured by how good the day was (lib/sun.ts). */
  .sun {
    transition:
      background-color 250ms var(--ease-glide),
      box-shadow 250ms var(--ease-glide),
      transform 160ms var(--ease-glide);
  }
  /* Numbers stay legible over any colour of the rainbow. */
  .on-rainbow {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }
  @media (prefers-reduced-motion: reduce) {
    .fill,
    .sun {
      transition: none;
    }
  }
</style>
