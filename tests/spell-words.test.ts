// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeIcs } from '../src/lib/ical';

/** The personal dictionary as the store keeps it: what is shown, and what is saved. */

const backend = vi.hoisted(() => ({ storage: null as unknown as object }));

vi.mock('../src/lib/storage', async () => {
  const types = await import('../src/lib/storage/types');
  const storage = new Proxy({}, {
    get: (_target, prop) => Reflect.get(backend.storage, prop),
  });
  return { ...types, storage };
});
vi.mock('../src/lib/log', () => ({ devError: vi.fn() }));

beforeEach(async () => {
  vi.resetModules();
  const { withEncryption } = await import('../src/lib/storage/encrypted');
  const { createMemoryBackend } = await import('../src/lib/storage/memory');
  const base = { kind: 'browser' } as unknown as import('../src/lib/storage/types').StorageBackend;
  backend.storage = withEncryption(
    createMemoryBackend(
      serializeIcs({ entries: [{ uid: 'e1', title: 'First entry', content: 'Text', date: new Date(2026, 9, 1) }] }),
      base,
    ),
  );
  vi.stubGlobal('$state', (value: unknown) => value);
  vi.stubGlobal('$derived', Object.assign((value: unknown) => value, {
    by: (compute: () => unknown) => compute(),
  }));
});

async function openApp() {
  const { app } = await import('../src/lib/store.svelte');
  await app.init();
  return app;
}

const saved = async () => (await import('../src/lib/config')).getSavedSpellWords();

describe('personal dictionary', () => {
  it('keeps the words sorted and saves them', async () => {
    const app = await openApp();
    app.addSpellWord('Zorblax');
    app.addSpellWord('Quuxify');
    expect(app.spellWords).toEqual(['Quuxify', 'Zorblax']);
    await vi.waitFor(async () => expect(await saved()).toEqual(['Quuxify', 'Zorblax']));
  });

  it('removes a word and brings it back with Undo', async () => {
    const app = await openApp();
    app.addSpellWord('Zorblax');
    app.removeSpellWord('Zorblax');
    expect(app.spellWords).toEqual([]);
    await vi.waitFor(async () => expect(await saved()).toEqual([]));

    const toast = app.toasts.at(-1);
    expect(toast?.message).toBe('Removed “Zorblax”');
    toast?.action?.run();
    expect(app.spellWords).toEqual(['Zorblax']);
    await vi.waitFor(async () => expect(await saved()).toEqual(['Zorblax']));
  });
});
