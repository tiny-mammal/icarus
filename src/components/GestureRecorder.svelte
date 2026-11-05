<script lang="ts">
  /**
   * Development-only panel for `?debug=gestures` (see lib/gesture-log): marks
   * what is about to be tried, shows that events are coming in, and downloads
   * the recording as JSON.
   */
  import { onMount } from 'svelte';
  import { gestureLog, watchFrames } from '../lib/gesture-log';

  const PRESETS = ['gentle swipe', 'fast swipe', 'repeated swipes', 'long swipe', 'weird'];

  let size = $state(gestureLog.size);
  let last = $state('');
  let note = $state('');
  let collapsed = $state(false);

  onMount(() => {
    const stopFrames = watchFrames();
    const unsubscribe = gestureLog.subscribe(() => {
      size = gestureLog.size;
    });
    return () => {
      stopFrames();
      unsubscribe();
    };
  });

  function mark(label: string) {
    const text = label.trim();
    if (!text) return;
    gestureLog.record('mark', { label: text });
    last = text;
    note = '';
  }

  function download() {
    const blob = new Blob([gestureLog.export()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icarus-gestures-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<div
  class="fixed bottom-3 left-3 z-[100] w-64 select-none rounded-xl border border-slate bg-surface/95 p-3 text-xs text-text shadow-2xl shadow-black/50 backdrop-blur"
  data-no-swipe
>
  <div class="flex items-center justify-between gap-2">
    <span class="font-semibold">Gesture recorder</span>
    <span class="tabular-nums text-muted">{size} events</span>
    <button class="text-muted hover:text-text" onclick={() => (collapsed = !collapsed)}>
      {collapsed ? 'Show' : 'Hide'}
    </button>
  </div>

  {#if !collapsed}
    <p class="mt-2 text-muted">Mark what you are about to try, then swipe over the calendar.</p>
    <div class="mt-2 flex flex-wrap gap-1">
      {#each PRESETS as preset (preset)}
        <button class="rounded-md bg-slate px-2 py-1 hover:bg-faint" onclick={() => mark(preset)}>{preset}</button>
      {/each}
    </div>
    <form class="mt-2 flex gap-1" onsubmit={(e) => { e.preventDefault(); mark(note); }}>
      <input
        class="min-w-0 flex-1 rounded-md border border-slate bg-ink px-2 py-1 text-text outline-none focus:border-faint"
        placeholder="Custom note…"
        bind:value={note}
      />
      <button class="rounded-md bg-slate px-2 py-1 hover:bg-faint" type="submit">Mark</button>
    </form>
    {#if last}
      <p class="mt-2 truncate text-muted">Last mark: <span class="text-text">{last}</span></p>
    {/if}
    <div class="mt-3 flex gap-1">
      <button class="flex-1 rounded-md bg-text px-2 py-1.5 font-medium text-ink" onclick={download}>Download</button>
      <button class="rounded-md bg-slate px-2 py-1.5 hover:bg-faint" onclick={() => { gestureLog.clear(); last = ''; }}>Clear</button>
    </div>
  {/if}
</div>
