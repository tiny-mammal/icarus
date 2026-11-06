<script lang="ts">
  /**
   * Custom suggestions popup for a misspelled word, opened on right-click in
   * the editor. Styled to match the app's other popovers, with arrow-key
   * navigation; picking a suggestion, adding to the personal dictionary or
   * ignoring the word is delegated to the parent (`RichEditor`).
   */
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { clickOutside, trapFocus } from '../lib/actions';

  let {
    x,
    y,
    word,
    suggestions,
    onPick,
    onAdd,
    onIgnore,
    onClose,
  }: {
    x: number;
    y: number;
    word: string;
    suggestions: string[];
    onPick: (suggestion: string) => void;
    onAdd: () => void;
    onIgnore: () => void;
    onClose: () => void;
  } = $props();

  let node = $state<HTMLDivElement>();
  let active = $state(0);

  // Placed once its real size is known, so it never overflows the viewport.
  // Hidden until then, which also avoids a flash at the click point.
  let left = $state(0);
  let top = $state(0);
  let placed = $state(false);
  $effect(() => {
    if (!node || placed) return;
    const rect = node.getBoundingClientRect();
    left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    placed = true;
  });

  function onKeydown(e: KeyboardEvent) {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = (active + 1) % suggestions.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active - 1 + suggestions.length) % suggestions.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onPick(suggestions[active]);
    }
  }
</script>

<div
  bind:this={node}
  class="fixed z-popover w-56 origin-top-left overflow-hidden rounded-xl border border-slate bg-surface py-1.5 shadow-2xl shadow-black/50 {placed
    ? ''
    : 'invisible'}"
  style="left: {left}px; top: {top}px;"
  transition:scale={{ duration: 130, start: 0.95, easing: cubicOut }}
  use:clickOutside={onClose}
  use:trapFocus={onClose}
  role="menu"
  aria-label="Spelling suggestions"
  tabindex="-1"
  onkeydown={onKeydown}
>
  <!-- The word being corrected, so the menu is self-explanatory. -->
  <p class="truncate px-3 pb-1 pt-1 text-[0.65rem] font-medium tracking-wider text-muted uppercase">
    {word}
  </p>

  {#if suggestions.length}
    <div class="max-h-64 overflow-y-auto">
      {#each suggestions as suggestion, i (suggestion)}
        <button
          class="flex w-full items-center px-3 py-1.5 text-left text-sm text-text transition-colors
            {i === active ? 'bg-slate' : 'hover:bg-slate'}"
          role="menuitem"
          onclick={() => onPick(suggestion)}
          onmouseenter={() => (active = i)}
        >
          <span class="truncate">{suggestion}</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="px-3 py-1.5 text-sm text-muted">No suggestions</p>
  {/if}

  <div class="my-1.5 border-t border-slate"></div>

  <button
    class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-text transition-colors hover:bg-slate"
    role="menuitem"
    onclick={onAdd}
  >
    <svg class="text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12 7v6M9 10h6"/></svg>
    Add to dictionary
  </button>

  <button
    class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-text transition-colors hover:bg-slate"
    role="menuitem"
    onclick={onIgnore}
  >
    <svg class="text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/></svg>
    Ignore
  </button>
</div>
