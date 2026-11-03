<script lang="ts">
  import { openExternal } from '../lib/external';
  import { renderMarkdown } from '../lib/markdown';
  import { clearHighlights, highlightElement } from '../lib/highlight';

  let {
    source,
    terms = [],
    onhighlight,
  }: {
    source: string;
    terms?: string[];
    onhighlight?: (count: number, first: HTMLElement | null) => void;
  } = $props();

  const html = $derived(renderMarkdown(source));
  let el = $state<HTMLDivElement | null>(null);

  // After the body renders (or the terms change), re-apply highlighting in
  // place and report the match count + first hit back to the parent.
  $effect(() => {
    void html;
    void terms;
    const root = el;
    if (!root) return;
    clearHighlights(root);
    const { count, first } = highlightElement(root, terms);
    onhighlight?.(count, first);
  });

  // Intercept anchor clicks so external URLs open in the system browser
  // instead of inside the app's webview.
  async function onClick(e: MouseEvent) {
    const a = (e.target as HTMLElement | null)?.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    if (!href || href === '#') return;
    e.preventDefault();
    await openExternal(href);
  }
</script>

<!-- Sanitized in renderMarkdown(); safe to inject. -->
<div
  bind:this={el}
  class="markdown"
  onclick={onClick}
  role="presentation"
>{@html html}</div>
