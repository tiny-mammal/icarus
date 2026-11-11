<script lang="ts">
  import { app } from '../lib/store.svelte';
  import Modal from './Modal.svelte';
  import Segmented from './Segmented.svelte';
  import StatsPeriodSelect from './StatsPeriodSelect.svelte';
  import TrackingStats from './TrackingStats.svelte';
  import WritingStats from './WritingStats.svelte';
  import type { StatsPeriod } from '../lib/stats';
  import { hasTracking } from '../lib/tracker-stats';

  type View = 'writing' | 'tracking';
  const VIEWS: readonly { value: View; label: string }[] = [
    { value: 'writing', label: 'Writing' },
    { value: 'tracking', label: 'Tracking' },
  ];

  let period = $state<StatsPeriod>('all');
  let chosen = $state<View>('writing');
  // A diary that never tracked anything has no tracking view to switch to.
  const tracked = $derived(hasTracking(app.tracker));
  const view = $derived(tracked ? chosen : 'writing');
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

    {#if tracked}
      <div class="mb-4">
        <Segmented
          value={view}
          options={VIEWS}
          onchange={(next) => (chosen = next)}
          label="Statistics view"
        />
      </div>
    {/if}

    {#if view === 'tracking'}
      <TrackingStats {period} />
    {:else}
      <WritingStats {period} />
    {/if}
  </Modal>
{/if}
