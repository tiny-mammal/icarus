// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeIcs } from '../src/lib/ical';

const state = vi.hoisted(() => ({
  files: new Map<string, string>(),
  stores: new Map<string, unknown>(),
  selections: [] as string[],
  activeFolder: '',
  rememberedFolder: null as string | null,
  failDraftWrite: false,
  rejectImport: false,
  rejectExport: false,
}));

vi.mock('../src/lib/storage', () => ({
  storage: {
    kind: 'folder',
    getRememberedVault: async () => {
      if (!state.rememberedFolder) return null;
      state.activeFolder = state.rememberedFolder;
      return { kind: 'file', path: `${state.rememberedFolder}/diary.ics` };
    },
    rememberVault: async (ref: { path: string } | null) => {
      state.activeFolder = ref?.path.slice(0, ref.path.lastIndexOf('/')) ?? '';
      const keep = state.stores.get(`${state.activeFolder}/settings/rememberFolder`) !== false;
      state.rememberedFolder = ref && keep ? state.activeFolder : null;
    },
    vaultExists: async (ref: { path: string }) => state.files.has(ref.path),
    readVault: async (ref: { path: string }) => state.files.get(ref.path)!,
    writeVault: async (ref: { path: string }, text: string) => {
      state.files.set(ref.path, text);
    },
    forgetVault: async () => {},
    pickVaultLocation: async () => {
      const path = state.selections.shift();
      return path ? { kind: 'file', path } : null;
    },
    pickDiaryText: async () => {
      if (state.rejectImport) {
        const { FolderHasDiaryError } = await import('../src/lib/storage/errors');
        throw new FolderHasDiaryError();
      }
      return null;
    },
    readDroppedPath: async () => null,
    encryption: {
      isUnlocked: () => false,
      keepSessionFor: () => {},
      lock: () => {},
    },
    saveBackup: async () => {
      if (state.rejectExport) {
        const { BackupExistsError } = await import('../src/lib/storage/errors');
        throw new BackupExistsError();
      }
      return false;
    },
    getItem: async (store: string, key: string) =>
      state.stores.get(`${state.activeFolder}/${store}/${key}`) ?? null,
    setItem: async (store: string, key: string, value: unknown) => {
      if (store === 'drafts' && state.failDraftWrite) throw new Error('Drive disconnected');
      state.stores.set(`${state.activeFolder}/${store}/${key}`, structuredClone(value));
    },
    removeItem: async (store: string, key: string) => {
      state.stores.delete(`${state.activeFolder}/${store}/${key}`);
    },
  },
}));
vi.mock('../src/lib/log', () => ({ devError: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  // Vitest imports the store as TypeScript; these stand in for Svelte runes.
  vi.stubGlobal('$state', (value: unknown) => value);
  vi.stubGlobal('$derived', { by: (compute: () => unknown) => compute() });
  state.files.clear();
  state.stores.clear();
  state.selections.length = 0;
  state.activeFolder = '';
  state.rememberedFolder = null;
  state.failDraftWrite = false;
  state.rejectImport = false;
  state.rejectExport = false;
});

describe('desktop folder flow', () => {
  it('loads each folder with its own drafts and preferences', async () => {
    const { app } = await import('../src/lib/store.svelte');
    state.files.set('/first/diary.ics', serializeIcs([]));
    state.files.set('/second/diary.ics', serializeIcs([]));
    state.stores.set('/first/drafts/drafts', [{
      id: 'first', title: 'Private draft', location: '', content: 'First folder',
      dateKey: '2026-09-25', updatedAt: 1,
    }]);
    state.stores.set('/first/settings/weekStart', 0);
    state.stores.set('/first/settings/dateFormat', 'iso');
    state.stores.set('/first/settings/spellcheck', false);
    state.selections.push('/first/diary.ics', '/second/diary.ics');

    await app.init();
    await app.openVaultFolder();
    expect(app.drafts).toHaveLength(1);
    expect(app.weekStart).toBe(0);
    expect(app.dateFormat).toBe('iso');
    expect(app.spellcheck).toBe(false);

    await app.openVaultFolder();
    expect(app.vault).toEqual({ kind: 'file', path: '/second/diary.ics' });
    expect(app.drafts).toEqual([]);
    expect(app.weekStart).toBe(1);
    expect(app.dateFormat).toBe('auto');
    expect(app.spellcheck).toBe(true);
  });

  it('reopens the last folder on launch until the user turns it off', async () => {
    state.files.set('/journal/diary.ics', serializeIcs([]));
    state.stores.set('/journal/settings/weekStart', 0);
    state.rememberedFolder = '/journal';

    let { app } = await import('../src/lib/store.svelte');
    await app.init();
    expect(app.view).toBe('main');
    expect(app.vault).toEqual({ kind: 'file', path: '/journal/diary.ics' });
    expect(app.weekStart).toBe(0);
    expect(app.rememberFolder).toBe(true);

    await app.setRememberFolder(false);
    expect(state.rememberedFolder).toBeNull();

    vi.resetModules();
    ({ app } = await import('../src/lib/store.svelte'));
    await app.init();
    expect(app.view).toBe('welcome');
  });

  it('forgets a remembered folder whose diary is gone', async () => {
    state.rememberedFolder = '/unplugged';
    const { app } = await import('../src/lib/store.svelte');
    await app.init();
    expect(app.view).toBe('welcome');
    expect(state.rememberedFolder).toBeNull();
  });

  it('keeps unsaved editor content when the folder disappears', async () => {
    const { app } = await import('../src/lib/store.svelte');
    state.files.set('/first/diary.ics', serializeIcs([]));
    state.selections.push('/first/diary.ics');
    await app.init();
    await app.openVaultFolder();
    app.draftTitle = 'Still writing';
    state.failDraftWrite = true;

    expect(await app.flushDraftNow()).toBe(false);
    expect(app.draftTitle).toBe('Still writing');
    expect(app.toasts.at(-1)?.level).toBe('error');
  });

  it('keeps the current diary when an import destination already has one', async () => {
    const { app } = await import('../src/lib/store.svelte');
    state.files.set('/first/diary.ics', serializeIcs([]));
    state.selections.push('/first/diary.ics');
    await app.init();
    await app.openVaultFolder();
    state.rejectImport = true;

    await app.importVault();
    expect(app.vault).toEqual({ kind: 'file', path: '/first/diary.ics' });
    expect(app.toasts.at(-1)?.message).toContain('already has a diary');
  });

  it('explains why an existing backup cannot be overwritten', async () => {
    const { app } = await import('../src/lib/store.svelte');
    state.rejectExport = true;

    await app.exportVault();
    expect(app.toasts.at(-1)?.message).toBe('Backup already exists. Choose a new filename.');
  });

  it('offers protection before creating a diary in an empty folder', async () => {
    const { app } = await import('../src/lib/store.svelte');
    state.selections.push('/fresh/diary.ics');
    await app.init();
    await app.openVaultFolder();

    expect(app.pendingDiary).toMatchObject({ source: 'new', ref: { path: '/fresh/diary.ics' } });
    expect(state.files.has('/fresh/diary.ics')).toBe(false);

    expect(await app.keepPendingDiaryPlain()).toBe(true);
    expect(state.files.get('/fresh/diary.ics')).toBe(serializeIcs([]));
    expect(app.view).toBe('main');
  });
});
