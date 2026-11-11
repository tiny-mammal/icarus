<script lang="ts">
  import { app } from '../lib/store.svelte';
</script>

<!--
  App-wide progress line along the top edge while the diary is being read or
  written (saving, deleting, importing, exporting...), so no slow action leaves
  the screen looking frozen. It fades in after a short delay (pure CSS), so
  quick actions never flash it. Only transform and opacity animate, so it keeps
  moving on the compositor even while the main thread is busy.
-->
{#if app.busy}
  <div class="bar z-progress" role="progressbar" aria-label="Working" aria-busy="true">
    <div class="runner"></div>
  </div>
{/if}

<style>
  .bar {
    position: fixed;
    inset: 0 0 auto 0;
    height: 3px;
    overflow: hidden;
    pointer-events: none;
    background: rgb(250 250 250 / 0.08);
    animation: appear 0.2s linear 0.25s backwards;
  }
  .runner {
    width: 40%;
    height: 100%;
    border-radius: 9999px;
    background: rgb(250 250 250 / 0.85);
    animation: slide 1.1s ease-in-out infinite;
  }
  @keyframes appear {
    from {
      opacity: 0;
    }
  }
  @keyframes slide {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(250%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .runner {
      width: 100%;
      animation: none;
      opacity: 0.5;
    }
  }
</style>
