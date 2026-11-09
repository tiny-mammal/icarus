<script lang="ts">
  import { tooltip } from '../lib/tooltip';
  import type { DiaryEntry } from '../lib/types';

  // Compact pager for stepping through the entries of a single day. Kept
  // deliberately smaller and quieter than the day stepper above it.
  let { entries, page = $bindable() }: { entries: DiaryEntry[]; page: number } = $props();

  const count = $derived(entries.length);

  function go(delta: number) {
    page = Math.min(Math.max(page + delta, 0), count - 1);
  }
</script>

<div class="flex items-center justify-center gap-3">
  <button
    class="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-slate hover:text-text disabled:pointer-events-none disabled:opacity-30"
    aria-label="Previous entry"
    use:tooltip={{ label: 'Previous entry', keys: ['Shift', '←'] }}
    disabled={page === 0}
    onclick={() => go(-1)}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  </button>

  <div class="flex items-center gap-1.5">
    {#each entries as e, i (e.uid)}
      <button
        class="h-1.5 rounded-full transition-all {i === page ? 'w-4 bg-text' : 'w-1.5 bg-faint hover:bg-muted'}"
        aria-label={`Go to entry ${i + 1}`}
        aria-current={i === page}
        onclick={() => (page = i)}
      ></button>
    {/each}
  </div>

  <span class="text-[0.7rem] font-medium tabular-nums text-muted">{page + 1} / {count}</span>

  <button
    class="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-slate hover:text-text disabled:pointer-events-none disabled:opacity-30"
    aria-label="Next entry"
    use:tooltip={{ label: 'Next entry', keys: ['Shift', '→'] }}
    disabled={page === count - 1}
    onclick={() => go(1)}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </button>
</div>
