<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * A translated sentence with a little markup inside it: `*emphasis*` and
   * `{name}` slots filled by snippets (icons). The whole sentence stays one
   * catalog message, so translators can reorder it freely.
   *
   *   <Rich message={t.app.installStepShare} slots={{ share: shareIcon }} />
   */
  let {
    message,
    slots = {},
    emphasisClass = 'font-medium text-text',
  }: {
    message: string;
    slots?: Record<string, Snippet>;
    emphasisClass?: string;
  } = $props();

  type Part = { text: string; emphasis?: boolean } | { slot: string };

  const parts = $derived.by(() => {
    const result: Part[] = [];
    let last = 0;
    for (const match of message.matchAll(/\*([^*]+)\*|\{(\w+)\}/g)) {
      if (match.index > last) result.push({ text: message.slice(last, match.index) });
      if (match[1] !== undefined) result.push({ text: match[1], emphasis: true });
      else if (match[2] in slots) result.push({ slot: match[2] });
      else result.push({ text: match[0] });
      last = match.index + match[0].length;
    }
    if (last < message.length) result.push({ text: message.slice(last) });
    return result;
  });
</script>

{#each parts as part, i (i)}{#if 'slot' in part}{@render slots[part.slot]()}{:else if part.emphasis}<span class={emphasisClass}>{part.text}</span>{:else}{part.text}{/if}{/each}
