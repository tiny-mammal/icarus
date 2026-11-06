import { describe, expect, it } from 'vitest';
import type { StorageBackend } from '../src/lib/storage';
import { createMemoryBackend } from '../src/lib/storage/memory';

describe('createMemoryBackend', () => {
  const base = { kind: 'browser' } as StorageBackend;

  it('serves and replaces the preloaded vault in memory', async () => {
    const mem = createMemoryBackend('BEGIN:VCALENDAR', base);
    const ref = await mem.getRememberedVault();
    expect(ref).toEqual({ kind: 'app' });
    expect(await mem.readVault(ref!)).toBe('BEGIN:VCALENDAR');
    await mem.writeVault(ref!, 'changed');
    expect(await mem.readVault(ref!)).toBe('changed');
    await mem.forgetVault(ref!);
    expect(await mem.getRememberedVault()).toBeNull();
  });

  it('keeps key-value stores separate and copies values', async () => {
    const mem = createMemoryBackend(null, base);
    const drafts = [{ id: 'a' }];
    await mem.setItem('drafts', 'list', drafts);
    drafts.push({ id: 'b' });
    expect(await mem.getItem('drafts', 'list')).toEqual([{ id: 'a' }]);
    expect(await mem.getItem('settings', 'list')).toBeNull();
    await mem.removeItem('drafts', 'list');
    expect(await mem.getItem('drafts', 'list')).toBeNull();
  });
});
