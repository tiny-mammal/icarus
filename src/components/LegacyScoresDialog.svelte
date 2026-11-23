<script lang="ts">
  /**
   * TEMPORARY. Brings the scores an old diary kept by hand inside its entries
   * into the tracker (see legacy-scores.ts, which says how to remove it). What
   * is certain is imported in one go; each day that is not is shown here with
   * its entries, the marks lit, for a person to read and score.
   */
  import { app } from '../lib/store.svelte';
  import Modal from './Modal.svelte';
  import StatTile from './StatTile.svelte';
  import { keyToDate, longDayLabel } from '../lib/date';
  import {
    LEGACY_SCALE,
    markSegments,
    planLegacyScores,
    type ConflictReason,
    type LegacyConflict,
    type LegacyField,
  } from '../lib/legacy-scores';
  import { sunColor } from '../lib/sun';
  import { viewport } from '../lib/viewport.svelte';
  import { fmt, formatNumber, t } from '../lib/i18n/index.svelte';

  const SCORES = Array.from({ length: LEGACY_SCALE }, (_, i) => i + 1);

  const plan = $derived(planLegacyScores(app.entries, app.tracker));
  // Days already settled or skipped this time round; skipping changes nothing in the diary.
  let handled = $state(new Set<string>());
  const pending = $derived(plan.conflicts.filter((conflict) => !handled.has(conflict.key)));
  const current = $derived<LegacyConflict | null>(pending[0] ?? null);
  const found = $derived(plan.ready.size + plan.unchanged + plan.conflicts.length);

  // Read at render time so the text follows the language.
  const REASONS: Record<ConflictReason, (conflict: LegacyConflict) => string> = {
    missing: () => t.tracker.legacy.reasonMissing,
    range: () => fmt(t.tracker.legacy.reasonRange, { scale: LEGACY_SCALE }),
    letter: () => t.tracker.legacy.reasonLetter,
    differs: () => t.tracker.legacy.reasonDiffers,
    unsure: () => t.tracker.legacy.reasonUnsure,
    existing: ({ existing }) =>
      fmt(t.tracker.legacy.reasonExisting, { value: existing?.value ?? '', scale: existing?.scale ?? '' }),
  };

  /** The entries of the conflict's day, each with the text of its marks lit. */
  const entries = $derived(
    current
      ? (app.entriesByDay.get(current.key) ?? []).map((entry) => {
          const part = (field: LegacyField) =>
            markSegments(
              entry[field],
              current.hits.filter((hit) => hit.uid === entry.uid && hit.field === field),
            );
          return { uid: entry.uid, title: part('title'), content: part('content') };
        })
      : [],
  );

  function importReady() {
    const count = plan.ready.size;
    app.importDayScores(plan.ready);
    app.toast('success', fmt(t.tracker.legacy.imported, { count }));
  }

  function settle(conflict: LegacyConflict, value: number | null) {
    if (value !== null) {
      app.importDayScores(new Map([[conflict.key, { value, scale: LEGACY_SCALE }]]));
    }
    handled = new Set([...handled, conflict.key]);
  }

  function onKey(e: KeyboardEvent) {
    if (!app.legacyScoresOpen || !current || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 's' || e.key === 'S') settle(current, null);
    else if (/^[0-9]$/.test(e.key)) settle(current, e.key === '0' ? LEGACY_SCALE : Number(e.key));
    else return;
    e.preventDefault();
  }

  function close() {
    app.legacyScoresOpen = false;
    handled = new Set();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if app.legacyScoresOpen}
  <Modal title={t.tracker.legacy.title} onclose={close} width="sm:max-w-xl" z="z-sheet" divided>
    <div class="grid grid-cols-3 gap-3">
      <StatTile
        label={t.tracker.legacy.marks}
        value={formatNumber(found)}
        sub={fmt(t.tracker.legacy.marksSub, { count: plan.days })}
      />
      <StatTile
        label={t.tracker.legacy.ready}
        value={formatNumber(plan.ready.size)}
        sub={t.tracker.legacy.readySub}
      />
      <StatTile
        label={t.tracker.legacy.toReview}
        value={formatNumber(pending.length)}
        sub={t.tracker.legacy.toReviewSub}
      />
    </div>

    <div class="mt-4 flex items-center justify-between gap-4">
      <p class="text-xs text-muted">
        {t.tracker.legacy.note}
      </p>
      <button
        type="button"
        class="shrink-0 rounded-lg bg-text px-3.5 py-2 text-sm font-semibold text-ink transition-transform hover:[transform:scale(1.02)] active:[transform:scale(0.98)] disabled:opacity-40 disabled:hover:[transform:none]"
        disabled={plan.ready.size === 0}
        onclick={importReady}
      >
        {fmt(t.tracker.legacy.importScores, { count: plan.ready.size })}
      </button>
    </div>

    {#if current}
      {#key current.key}
        <section class="mt-6 border-t border-slate pt-5" aria-label={t.tracker.legacy.dayToReview}>
          <div class="flex items-baseline justify-between gap-4">
            <h3 class="text-sm font-medium text-text">
              {longDayLabel(keyToDate(current.key), app.dateFormat)}
            </h3>
            <p class="shrink-0 text-xs tabular-nums text-muted">
              {fmt(t.tracker.legacy.progress, { current: handled.size + 1, total: handled.size + pending.length })}
            </p>
          </div>
          <ul class="mt-1.5 space-y-0.5 text-xs text-muted">
            {#each current.reasons as reason}
              <li>{REASONS[reason](current)}</li>
            {/each}
          </ul>

          <div
            class="mt-3 max-h-64 space-y-4 overflow-y-auto rounded-xl border border-slate bg-ink/50 p-3.5 text-sm leading-relaxed text-text"
          >
            {#each entries as entry (entry.uid)}
              <article>
                {#if entry.title.length > 0}
                  <p class="font-medium">
                    {#each entry.title as seg}{#if seg.marked}<mark class="search-hl">{seg.text}</mark>{:else}{seg.text}{/if}{/each}
                  </p>
                {/if}
                <p class="whitespace-pre-wrap text-muted">
                  {#each entry.content as seg}{#if seg.marked}<mark class="search-hl">{seg.text}</mark>{:else}{seg.text}{/if}{/each}
                </p>
              </article>
            {/each}
          </div>

          <p class="mt-4 text-xs text-muted">
            {current.suggestion !== null
              ? fmt(t.tracker.legacy.scoreForDaySuggested, { score: current.suggestion })
              : t.tracker.legacy.scoreForDay}
          </p>
          <div class="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {#each SCORES as value}
              <button
                type="button"
                class="rounded-lg border py-2 text-sm font-medium tabular-nums text-text transition-colors hover:bg-slate
                  {current.suggestion === value ? 'border-text' : 'border-slate'}"
                style:background-color={sunColor({ value, scale: LEGACY_SCALE }, 0.14)}
                aria-label={fmt(t.tracker.legacy.scoreValue, { value })}
                onclick={() => settle(current, value)}
              >
                {value}
              </button>
            {/each}
          </div>
          <div class="mt-3 flex items-center justify-between gap-4">
            <p class="text-[0.7rem] text-muted">
              {#if !viewport.compact}{t.tracker.legacy.shortcuts}{/if}
            </p>
            <button
              type="button"
              class="rounded-lg border border-slate px-3 py-1.5 text-xs text-muted transition-colors hover:bg-slate hover:text-text"
              onclick={() => settle(current, null)}
            >
              {t.tracker.legacy.skip}
            </button>
          </div>
        </section>
      {/key}
    {:else}
      <p class="mt-6 rounded-xl border border-dashed border-slate px-4 py-6 text-center text-sm text-muted">
        {found === 0
          ? t.tracker.legacy.noMarks
          : plan.ready.size > 0
            ? t.tracker.legacy.importThenSettle
            : t.tracker.legacy.nothingLeft}
      </p>
    {/if}
  </Modal>
{/if}
