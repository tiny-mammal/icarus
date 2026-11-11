<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * A button/status label with a "working" ellipsis: while `busy`, three dots
   * pulse after the text, so a slow action (saving a huge diary on an old
   * phone) visibly isn't frozen. The dots are always laid out, only their
   * opacity changes, so the label never shifts width. Opacity animations run
   * on the compositor, so they keep moving even while the main thread is busy.
   */
  let { busy = true, children }: { busy?: boolean; children: Snippet } = $props();
</script>

{@render children()}{#if busy}<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>{/if}

<style>
  .dots i {
    font-style: normal;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .dots i:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dots i:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0.15;
    }
    40% {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dots i {
      animation: none;
    }
  }
</style>
