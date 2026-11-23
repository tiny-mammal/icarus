<script lang="ts">
  /**
   * Which languages spell check knows. Several can be on at once, for people
   * who write in more than one; turning them all off turns spell check off.
   * Opened from Settings, over it, so closing returns there.
   */
  import { app } from '../lib/store.svelte';
  import { i18n, languageName, t } from '../lib/i18n/index.svelte';
  import { LOCALES, LOCALE_NAMES } from '../lib/i18n/locales';
  import Modal from './Modal.svelte';
  import SettingsRow from './SettingsRow.svelte';
  import Switch from './Switch.svelte';

  let { onclose }: { onclose: () => void } = $props();
</script>

<Modal title={t.settings.spellcheck} {onclose} backLabel={t.settings.backToSettings} width="sm:max-w-md" z="z-dialog">
  <p class="text-xs leading-relaxed text-muted">{t.settings.spellcheckIntro}</p>

  <section class="mt-4 divide-y divide-slate rounded-xl border border-slate bg-slate-soft/50" aria-label={t.settings.spellcheckLanguages}>
    {#each LOCALES as locale (locale)}
      {@const on = app.spellLocales.includes(locale)}
      <SettingsRow label={LOCALE_NAMES[locale]} hint={locale === i18n.locale ? undefined : languageName(locale)}>
        <Switch checked={on} label={LOCALE_NAMES[locale]} onchange={(next) => app.setSpellLanguage(locale, next)} />
      </SettingsRow>
    {/each}
  </section>
</Modal>
