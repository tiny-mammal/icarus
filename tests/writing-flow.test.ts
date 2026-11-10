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
    expect(app.hasPendingEdit(entry.uid)).toBe(false);
  });

  it('keeps a changed revision as a draft when leaving without saving', async () => {
    const app = await openApp();
    await app.editEntry(app.entries[0]);
    app.draftContent = 'Changed text';

    app.stopEditing();
    // The reader is told at once, before the draft is even written.
    expect(app.hasPendingEdit('e1')).toBe(true);
    await vi.waitFor(() => expect(app.drafts).toHaveLength(1));
    expect(app.drafts[0].editingUid).toBe('e1');
    expect(app.editingUid).toBe('e1'); // still loaded, ready to resume
    expect(app.entries[0].content).toBe('Original text');

    // Saving the revision settles it.
    app.resumeParked();
    await app.commit();
    expect(app.hasPendingEdit('e1')).toBe(false);
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

  it('shows when the work is saved, and keeps it minimized on closing', async () => {
    const app = await openApp();
    await app.newEntryOn('2026-12-05');
    app.draftTitle = 'Half-written';
    expect(app.draftSaved).toBe(false);

    expect(await app.flushDraftNow()).toBe(true);
    expect(app.draftSaved).toBe(true);

    app.closeEditor();
    expect(app.editing).toBe(false);
    expect(app.parkedDraft?.title).toBe('Half-written');
    expect(app.drafts.map((d) => d.title)).toEqual(['Half-written']);

    app.resumeParked();
    expect(app.parkedDraft).toBeNull();
    expect(app.draftTitle).toBe('Half-written');
  });

  it('parks the latest saved draft once the editor is empty', async () => {
    const app = await openApp();
    await app.newEntryOn('2026-12-05');
    app.draftTitle = 'Older';
    // A new entry stashes the work in progress, which stays parked.
    await app.startNewEntry();
    app.draftTitle = 'Newer';
    expect(await app.flushDraftNow()).toBe(true);
    app.closeEditor();
    expect(app.parkedDraft?.title).toBe('Newer');

    // Saving it leaves the other draft waiting, which reopens from storage.
    app.resumeParked();
    await app.commit();
    expect(app.hasEditorContent()).toBe(false);
    expect(app.parkedDraft?.title).toBe('Older');
    app.resumeParked();
    await vi.waitFor(() => expect(app.editing).toBe(true));
    expect(app.draftTitle).toBe('Older');
  });

  it('closes an empty editor quietly', async () => {
    const app = await openApp();
    await app.newEntryOn('2026-12-05');
    app.closeEditor();
    await Promise.resolve();
    expect(app.parkedDraft).toBeNull();
    expect(app.toasts).toEqual([]);
    expect(app.drafts).toEqual([]);
  });

  it('discarding the open draft goes back to the calendar', async () => {
    const app = await openApp();
    await app.newEntryOn('2026-10-05');
    app.draftTitle = 'Not worth keeping';
    expect(await app.flushDraftNow()).toBe(true);

    app.requestDeleteDraft(app.draftId!);
    expect(app.discardingOpenDraft).toBe(true);
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
  it('closing the editor returns to the calendar when it was opened from there', async () => {
    const app = await openApp();
    await app.openDay('2026-10-01');
    app.draftContent = 'Notes for another day';
    app.draftDateKey = '2026-11-03';
    app.closeDay();
    const month = app.currentMonth;

    // Resuming the work in progress opens it on its own day…
    app.resumeWriting();
    expect(app.selectedKey).toBe('2026-11-03');

    // …but closing goes back to the calendar, not to that day's pane.
    app.closeEditor();
    expect(app.editing).toBe(false);
    expect(app.selectedKey).toBeNull();
    expect(app.currentMonth).toBe(month);
    expect(app.draftContent).toBe('Notes for another day'); // still loaded
  });

  it('closing the editor returns to the day that was being read', async () => {
    const app = await openApp();
    app.jumpToEntry(app.entries[0], 'Original');

    await app.newEntryOn('2026-10-01');
    app.draftDateKey = '2026-12-24';
    app.closeEditor();

    expect(app.selectedKey).toBe('2026-10-01');
    expect(app.readingUid).toBe('e1');
    expect(app.searchHighlight).toBe('Original');
    expect(app.currentMonth.getMonth()).toBe(9);
  });

  it('minimizing an edit leaves its day, unless nothing changed', async () => {
    const app = await openApp();
    app.jumpToEntry(app.entries[0]);

    await app.editEntry(app.entries[0]);
    expect(app.editorHasChanges).toBe(false); // a plain close
    app.closeEditor();
    expect(app.selectedKey).toBe('2026-10-01');

    await app.editEntry(app.entries[0]);
    app.draftContent = 'Changed text';
    expect(app.editorHasChanges).toBe(true); // a minimize
    app.closeEditor();
    expect(app.selectedKey).toBeNull();
    expect(app.parkedDraft?.revision).toBe(true);
  });
});
