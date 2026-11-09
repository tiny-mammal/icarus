<script lang="ts">
  import { tooltip } from '../lib/tooltip';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/store.svelte';
  import { updates } from '../lib/updates.svelte';
  import { timeAgo } from '../lib/date';
  import UpdateMark from './UpdateMark.svelte';

  /**
   * A quiet card in the bottom-left corner, in one of two moods:
   *  - `update`: a newer version is published (desktop with checks on).
   *  - `reminder`: this build is over a month old, so ask whether to look.
   * It never covers the editor: it waits while an entry is being written.
   */
  const kind = $derived(app.editing || app.overlayOpen ? null : updates.notice);
  const released = $derived(updates.latest ? timeAgo(new Date(updates.latest.published)) : '');

  /** "October", or "October 2025" when it isn't this year. */
  const builtLabel = $derived.by(() => {
    const built = updates.builtAt;
    if (!built) return '';
    const sameYear = built.getFullYear() === new Date().getFullYear();
    return built.toLocaleDateString('en', sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' });
  });

  const checking = $derived(updates.status === 'checking');

  function download() {
    void updates.download();
    app.toast('info', 'Install the new version over this one. Your diary stays where it is.');
  }

  async function look() {
    const result = await updates.lookForUpdate();
    if (result === 'current') app.toast('success', `You have the latest version, ${updates.current}.`);
    else if (result === 'failed') app.toast('error', 'Could not reach icarus.4oli.com. Try again later.');
  }
</script>

{#if kind}
  <div
    class="update-card fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-5 z-float w-[22rem] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-slate bg-surface/95 shadow-2xl shadow-black/60 backdrop-blur-xl sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
    class:quiet={kind === 'reminder'}
    role="status"
    aria-live="polite"
    transition:fly={{ y: 16, duration: 320, easing: cubicOut }}
  >
    <div class="relative flex gap-3.5 p-4">
      <UpdateMark still={kind === 'reminder'} />
      <div class="min-w-0 flex-1">
        {#if kind === 'update' && updates.latest}
          <p class="text-sm font-medium text-text">Icarus {updates.latest.version} is ready</p>
          <p class="mt-0.5 text-xs text-muted">
            Released {released}
            <span class="text-faint">·</span>
            <span class="tabular-nums">{updates.current}</span>
            <span aria-hidden="true">→</span>
            <span class="tabular-nums text-text">{updates.latest.version}</span>
          </p>
        {:else}
          <p class="text-sm font-medium text-text">Look for a newer Icarus?</p>
          <p class="mt-0.5 text-xs leading-relaxed text-muted">
            You're on <span class="tabular-nums text-text">{updates.current}</span>{#if builtLabel}, from {builtLabel}{/if}.
            New versions bring fixes and new features.
          </p>
        {/if}

        <div class="mt-3.5 flex items-center gap-2">
          {#if kind === 'update'}
            <button class="primary" onclick={download}>Get the update</button>
            <button class="secondary" onclick={() => updates.snooze()}>Later</button>
          {:else}
            <button class="primary flex items-center gap-1.5" onclick={look} disabled={checking}>
              {#if checking}
                <svg class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                Checking…
              {:else}
                Check for updates
                {#if !updates.canCheck}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>
                {/if}
              {/if}
            </button>
            <button class="secondary" onclick={() => void updates.snoozeReminder()} disabled={checking}>Not now</button>
          {/if}
        </div>
      </div>
      <button
        class="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-slate hover:text-text"
        aria-label={kind === 'update' ? 'Dismiss until next launch' : 'Remind me next month'}
        use:tooltip={kind === 'update' ? 'Dismiss until next launch' : 'Remind me next month'}
        onclick={() => (kind === 'update' ? updates.snooze() : void updates.snoozeReminder())}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </div>
{/if}

<style>
  /* A warm sunrise along the top edge: Icarus, flying toward the sun. */
  .update-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      90% 70% at 12% 0%,
      color-mix(in oklab, #f5b452 16%, transparent) 0%,
      transparent 70%
    );
  }
  .update-card::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 1px;
    pointer-events: none;
    background: linear-gradient(90deg, transparent, #f5b45288 30%, transparent 85%);
  }
  /* The reminder is a question, not news: a dimmer dawn. */
  .update-card.quiet::before {
    opacity: 0.5;
  }
  .update-card.quiet::after {
    opacity: 0.4;
  }
  .primary {
    border-radius: 0.5rem;
    background: var(--color-text);
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-ink);
    transition: transform 150ms;
  }
  .primary:hover:not(:disabled) {
    transform: scale(1.02);
  }
  .primary:active:not(:disabled) {
    transform: scale(0.98);
  }
  .primary:disabled {
    opacity: 0.75;
  }
  .secondary {
    border-radius: 0.5rem;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-muted);
    transition: background-color 150ms, color 150ms;
  }
  .secondary:hover:not(:disabled) {
    background: var(--color-slate);
    color: var(--color-text);
  }
</style>
