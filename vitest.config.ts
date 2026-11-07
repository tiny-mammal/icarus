import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Unit tests for the TS modules run in Node. The Svelte plugin compiles runes
// in `*.svelte.ts` modules (e.g. reactive state shared with actions).
export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
