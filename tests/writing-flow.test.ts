// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeIcs } from '../src/lib/ical';

/**
 * Reading and writing share the day pane: `editing` swaps the reader for the
 * editor. These cover the transitions between the two and what they leave in
 * the drafts list.
 */

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
      serializeIcs([{ uid: 'e1', title: 'First entry', content: 'Original text', date: new Date(2026, 9, 1) }]),
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
  expect(app.view).toBe('main');
  return app;
}

describe('writing in the day pane', () => {
  it('opens an entry for editing on its day and leaves no draft when untouched', async () => {
    const app = await openApp();
    const entry = app.entries[0];

    await app.editEntry(entry);
    expect(app.editing).toBe(true);
    expect(app.selectedKey).toBe('2026-10-01');
    expect(app.draftContent).toBe('Original text');

    // Autosave doesn't turn an untouched revision into a draft…
    expect(await app.flushDraftNow()).toBe(true);
    expect(app.drafts).toEqual([]);

    // …and going back to reading unloads it, so "write" starts fresh.
    app.stopEditing();
    expect(app.editing).toBe(false);
    expect(app.editingUid).toBeNull();
    expect(app.selectedKey).toBe('2026-10-01');
  });

  it('keeps a changed revision as a draft when leaving without saving', async () => {
    const app = await openApp();
    await app.editEntry(app.entries[0]);
    app.draftContent = 'Changed text';

    app.stopEditing();
    await vi.waitFor(() => expect(app.drafts).toHaveLength(1));
    expect(app.drafts[0].editingUid).toBe('e1');
    expect(app.editingUid).toBe('e1'); // still loaded, ready to resume
    expect(app.entries[0].content).toBe('Original text');
  });

  it('saves a new entry and returns to the calendar on its month', async () => {
    const app = await openApp();
    await app.newEntryOn('2026-10-05');
    expect(app.editing).toBe(true);
    expect(app.selectedKey).toBe('2026-10-05');

    app.draftTitle = 'Second entry';
    app.draftContent = 'Written in the pane';
    await app.commit();

    expect(app.editing).toBe(false);
    expect(app.selectedKey).toBeNull();
    expect(app.currentMonth).toEqual(new Date(2026, 9, 1));
    expect(app.entries.some((e) => e.title === 'Second entry')).toBe(true);
    expect(app.drafts).toEqual([]);
  });

  it('"Save as draft" parks the work and goes back to the calendar', async () => {
    const app = await openApp();
    await app.newEntryOn('2026-12-05');
    app.draftTitle = 'Half-written';

    await app.saveDraftAndReset();
    expect(app.editing).toBe(false);
    expect(app.selectedKey).toBeNull();
    expect(app.currentMonth).toEqual(new Date(2026, 11, 1));
    expect(app.drafts.map((d) => d.title)).toEqual(['Half-written']);
    expect(app.hasEditorContent()).toBe(false);
  });

  it('discarding the open draft goes back to the calendar', async () => {
    const app = await openApp();
    await app.newEntryOn('2026-10-05');
    app.draftTitle = 'Not worth keeping';
    expect(await app.flushDraftNow()).toBe(true);

    app.requestDeleteDraft(app.draftId!);
    await app.confirmDeleteDraft();
    expect(app.editing).toBe(false);
    expect(app.selectedKey).toBeNull();
    expect(app.drafts).toEqual([]);
  });

  it('full screen lasts while the pane is open and resets when it closes', async () => {
    const app = await openApp();
    app.openDay('2026-10-01');
    app.paneExpanded = true;

    // Kept across days and into writing…
    app.openDay('2026-10-05');
    await app.newEntryOn('2026-10-05');
    expect(app.paneExpanded).toBe(true);

    // …and dropped once saving returns to the calendar.
    app.draftTitle = 'Focused';
    await app.commit();
    expect(app.paneExpanded).toBe(false);

    app.openDay('2026-10-01');
    app.paneExpanded = true;
    app.closeDay();
    expect(app.paneExpanded).toBe(false);
  });

  it('navigating to another day stops editing and keeps the work', async () => {
    const app = await openApp();
    await app.newEntryOn('2026-10-05');
    app.draftTitle = 'In progress';

    app.openDay('2026-10-01');
    expect(app.editing).toBe(false);
    expect(app.selectedKey).toBe('2026-10-01');
    await vi.waitFor(() => expect(app.drafts.map((d) => d.title)).toEqual(['In progress']));
  });
});
