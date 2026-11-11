<script lang="ts">
  import type { Snippet } from 'svelte';
  import { multiTap, type MultiTapOptions } from '../lib/actions';

  /**
   * A titled group of settings rows in one card. The card doesn't clip its
   * content (a row's select must be able to hang over the next section), so
   * rows round their own outer corners.
   */
  let {
    title,
    badge,
    taps,
    children,
  }: {
    title: string;
    /** Status shown beside the title, e.g. "Encrypted". */
    badge?: Snippet;
    /** Something kept out of sight that a run of taps on the heading sets off. */
    taps?: MultiTapOptions;
    children: Snippet;
  } = $props();
</script>

<section class="mt-6 first:mt-0" aria-label={title}>
  <div class="mb-2 flex min-h-5 items-center justify-between px-1" use:multiTap={taps}>
    <h3 class="text-[0.7rem] font-medium uppercase tracking-wider text-muted">{title}</h3>
    {@render badge?.()}
  </div>
  <div class="divide-y divide-slate rounded-xl border border-slate bg-slate-soft/50">
    {@render children()}
  </div>
</section>
