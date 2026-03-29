import { openNoteInWorkspace } from '../../view/open-note';
import { assert, test, vi } from 'vitest';

type OpenNoteApp = Parameters<typeof openNoteInWorkspace>[0];

void test('openNoteInWorkspace reuses an existing markdown leaf for the target path', async () => {
	const existingLeaf = {
		view: { file: { path: 'Timelink-Calendar/existing.md' } },
		getViewState: () => ({ state: {} }),
	};
	const openLinkText = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
	const revealLeaf = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
	const setActiveLeaf = vi.fn();
	const getLeaf = vi.fn();
	const app = {
		workspace: {
			getLeavesOfType: vi.fn(() => [existingLeaf]),
			getLeaf,
			openLinkText,
			revealLeaf,
			setActiveLeaf,
		},
		vault: {
			getAbstractFileByPath: vi.fn(),
		},
	};

	await openNoteInWorkspace(app as unknown as OpenNoteApp, 'Timelink-Calendar/existing.md');

	assert.deepStrictEqual(revealLeaf.mock.calls, [[existingLeaf]]);
	assert.deepStrictEqual(setActiveLeaf.mock.calls, [[existingLeaf, { focus: true }]]);
	assert.strictEqual(getLeaf.mock.calls.length, 0);
	assert.strictEqual(openLinkText.mock.calls.length, 0);
});

void test('openNoteInWorkspace opens a resolved file in a concrete tab leaf and activates it', async () => {
	const targetFile = { path: 'Timelink-Calendar/sample.md' };
	const newLeaf = {
		view: {},
		getViewState: () => ({ state: {} }),
		openFile: vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined),
	};
	const openLinkText = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
	const revealLeaf = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
	const setActiveLeaf = vi.fn();
	const getLeaf = vi.fn((kind?: unknown) => (kind === 'tab' ? newLeaf : null));
	const app = {
		workspace: {
			getLeavesOfType: vi.fn(() => []),
			getLeaf,
			openLinkText,
			revealLeaf,
			setActiveLeaf,
		},
		vault: {
			getAbstractFileByPath: vi.fn(() => targetFile),
		},
	};

	await openNoteInWorkspace(app as unknown as OpenNoteApp, targetFile.path);

	assert.deepStrictEqual(newLeaf.openFile.mock.calls, [[targetFile, { active: true }]]);
	assert.deepStrictEqual(revealLeaf.mock.calls, [[newLeaf]]);
	assert.deepStrictEqual(setActiveLeaf.mock.calls, [[newLeaf, { focus: true }]]);
	assert.strictEqual(openLinkText.mock.calls.length, 0);
});

void test('openNoteInWorkspace falls back to workspace.openLinkText when no openable tab leaf is available', async () => {
	const openLinkText = vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
	const app = {
		workspace: {
			getLeavesOfType: vi.fn(() => []),
			getLeaf: vi.fn(() => null),
			openLinkText,
			revealLeaf: vi.fn(),
			setActiveLeaf: vi.fn(),
		},
		vault: {
			getAbstractFileByPath: vi.fn(() => null),
		},
	};

	await openNoteInWorkspace(app as unknown as OpenNoteApp, 'Timelink-Calendar/fallback.md');

	assert.deepStrictEqual(openLinkText.mock.calls, [['Timelink-Calendar/fallback.md', '', true]]);
});
