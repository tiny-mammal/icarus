<script lang="ts">
  import PasswordField from './PasswordField.svelte';
  import { assessPassword } from '../lib/password';

  /** Choose-a-password pair with a strength meter; `valid` once both agree. */
  let {
    password = $bindable(''),
    valid = $bindable(false),
    label = 'New password',
    autofocus = false,
  }: {
    password?: string;
    valid?: boolean;
    label?: string;
    autofocus?: boolean;
  } = $props();

  let confirmation = $state('');
  const assessment = $derived(assessPassword(password));
  const mismatch = $derived(confirmation.length > 0 && confirmation !== password);
  const hintId = `password-hint-${Math.random().toString(36).slice(2)}`;

  $effect(() => {
    valid = assessment.acceptable && confirmation === password;
  });

  const meterColor = ['bg-red-400', 'bg-red-400', 'bg-amber-300', 'bg-emerald-400'];
</script>

<div class="space-y-3">
  <div>
    <PasswordField {label} bind:value={password} autocomplete="new-password" {autofocus} describedby={hintId} />
    <div class="mt-2 grid grid-cols-3 gap-1" aria-hidden="true">
      {#each [1, 2, 3] as step (step)}
        <span
          class="h-1 rounded-full transition-colors
            {password && assessment.score >= step ? meterColor[assessment.score] : 'bg-slate'}"
        ></span>
      {/each}
    </div>
    <p id={hintId} class="mt-1.5 text-xs text-muted" aria-live="polite">
      {password ? assessment.hint : 'Tip: a phrase of 5–6 random words is strong and memorable.'}
    </p>
  </div>
  <div>
    <PasswordField label="Repeat password" bind:value={confirmation} autocomplete="new-password" invalid={mismatch} />
    {#if mismatch}
      <p class="mt-1.5 text-xs text-red-400">The passwords don't match.</p>
    {/if}
  </div>
</div>
