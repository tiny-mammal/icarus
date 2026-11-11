<script lang="ts">
  import type { HabitMark } from '../lib/types';

  /**
   * How a habit went on a day, as one mark: a filled disc with a tick when
   * done, a dash when missed, an empty ring while not marked. `dot` is the
   * tiny version shown in the day's header.
   */
  let { mark, dot = false }: { mark: HabitMark | undefined; dot?: boolean } = $props();
</script>

{#if dot}
  <span
    class="block h-[7px] w-[7px] rounded-full
      {mark === 'done' ? 'bg-text' : mark === 'missed' ? 'h-[2px] w-[7px] rounded-none bg-muted' : 'border border-muted/70'}"
    aria-hidden="true"
  ></span>
{:else}
  <span
    class="grid h-[1.375rem] w-[1.375rem] shrink-0 place-items-center rounded-full border transition-colors
      {mark === 'done'
        ? 'border-text bg-text text-ink'
        : mark === 'missed'
          ? 'border-faint text-muted'
          : 'border-faint group-hover:border-muted'}"
    aria-hidden="true"
  >
    {#if mark}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        {#if mark === 'done'}
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        {:else}
          <path d="M7 12h10" />
        {/if}
      </svg>
    {/if}
  </span>
{/if}
