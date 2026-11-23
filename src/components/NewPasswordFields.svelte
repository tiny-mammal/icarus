<script lang="ts">
  import PasswordField from './PasswordField.svelte';
  import { assessPassword } from '../lib/password';
  import { t } from '../lib/i18n/index.svelte';

  /** Choose-a-password pair with a strength meter; `valid` once both agree. */
  let {
    password = $bindable(''),
    valid = $bindable(false),
    label,
    autofocus = false,
  }: {
    password?: string;
    valid?: boolean;
    /** Defaults to "New password". */
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
    <PasswordField label={label ?? t.privacy.newPassword} bind:value={password} autocomplete="new-password" {autofocus} describedby={hintId} />
    <div class="mt-2 grid grid-cols-3 gap-1" aria-hidden="true">
      {#each [1, 2, 3] as step (step)}
        <span
          class="h-1 rounded-full transition-colors
            {password && assessment.score >= step ? meterColor[assessment.score] : 'bg-slate'}"
        ></span>
      {/each}
    </div>
    <p id={hintId} class="mt-1.5 text-xs text-muted" aria-live="polite">
      {password ? assessment.hint : t.privacy.passwordTip}
    </p>
  </div>
  <div>
    <PasswordField label={t.privacy.repeatPassword} bind:value={confirmation} autocomplete="new-password" invalid={mismatch} />
    {#if mismatch}
      <p class="mt-1.5 text-xs text-red-400">{t.privacy.passwordsDontMatch}</p>
    {/if}
  </div>
</div>
