<script lang="ts">
  import { app } from '../lib/store.svelte';
  import Modal from './Modal.svelte';
  import StatsPeriodSelect from './StatsPeriodSelect.svelte';
  import WritingStats from './WritingStats.svelte';
  import type { StatsPeriod } from '../lib/stats';

  let period = $state<StatsPeriod>('all');
</script>

{#if app.statsOpen}
  <Modal
    title="Statistics"
    onclose={() => (app.statsOpen = false)}
    width="sm:max-w-2xl"
    z="z-sheet"
    divided
  >
    {#snippet actions()}
      <StatsPeriodSelect bind:period />
    {/snippet}

    <WritingStats {period} />
  </Modal>
{/if}
