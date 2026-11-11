<script lang="ts">
  /** A rising sun, the mark of a new version (update notice and Settings). */
  let { size = 'md', still = false }: { size?: 'sm' | 'md'; still?: boolean } = $props();
</script>

<span
  class:still
  class="mark relative grid shrink-0 place-items-center rounded-full border border-sun/30 bg-sun/10 text-[#f7c77a]
    {size === 'md' ? 'h-9 w-9' : 'h-7 w-7'}"
  aria-hidden="true"
>
  <svg width={size === 'md' ? 18 : 15} height={size === 'md' ? 18 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 18a5 5 0 0 0-10 0"/>
    <path d="M12 9V2"/>
    <path d="m9 5 3-3 3 3"/>
    <path d="m4.22 10.22 1.42 1.42"/>
    <path d="m18.36 11.64 1.42-1.42"/>
    <path d="M1 18h2"/>
    <path d="M21 18h2"/>
    <path d="M23 22H1"/>
  </svg>
</span>

<style>
  .mark::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 999px;
    box-shadow: 0 0 0 0 #f5b45255;
    animation: glow 2.8s var(--ease-glide) infinite;
  }
  @keyframes glow {
    0% { box-shadow: 0 0 0 0 #f5b45255; }
    70%, 100% { box-shadow: 0 0 0 9px #f5b45200; }
  }
  /* Only news glows; a question sits still. */
  .still::after { animation: none; }
  @media (prefers-reduced-motion: reduce) {
    .mark::after { animation: none; }
  }
</style>
