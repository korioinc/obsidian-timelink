import {
	buildLinkedCardPathSet,
	registerKanbanCardEventIndicatorRefresh,
	shouldRefreshCardEventIndicators,
} from '../services/event-indicator-refresh-service.ts';
import type { KanbanBoard } from '../types';
import { assert, test } from 'vitest';

type MetadataEventName = 'changed' | 'deleted';
type VaultEventName = 'rename';

type MetadataChangedCallback = (
	file: { path: string },
	data: string,
	cache: Record<string, unknown>,
) => void;
type MetadataDeletedCallback = (
	file: { path: string },
	prevCache: Record<string, unknown> | null,
) => void;
type VaultRenameCallback = (file: { path: string }, oldPath: string) => void;

type FakeApp = {
	metadataCache: {
		getFirstLinkpathDest: (
			linkpath: string,
			sourcePath: string,
		) => { path: string; basename: string } | null;
		on: (
			event: MetadataEventName,
			callback: MetadataChangedCallback | MetadataDeletedCallback,
		) => void;
		off: (
			event: MetadataEventName,
			callback: MetadataChangedCallback | MetadataDeletedCallback,
		) => void;
		triggerChanged: (path: string) => void;
		triggerDeleted: (path: string) => void;
	};
	vault: {
		on: (event: VaultEventName, callback: VaultRenameCallback) => void;
		off: (event: VaultEventName, callback: VaultRenameCallback) => void;
		triggerRename: (path: string, oldPath: string) => void;
	};
};

const createBoard = (): KanbanBoard => ({
	lanes: [
		{
			id: 'lane-1',
			title: 'Todo',
			lineStart: 1,
			lineEnd: 2,
			cards: [
				{ id: 'card-1', title: '[[cards/a]]', lineStart: 2, blockId: undefined },
				{ id: 'card-2', title: '[[cards/a]]', lineStart: 3, blockId: undefined },
				{ id: 'card-3', title: '[[cards/b]]', lineStart: 4, blockId: undefined },
				{ id: 'card-4', title: 'plain title', lineStart: 5, blockId: undefined },
			],
		},
	],
	settings: {},
});

const createFakeApp = (): FakeApp => {
	const metadataListeners = new Map<
		MetadataEventName,
		Set<MetadataChangedCallback | MetadataDeletedCallback>
	>();
	const vaultListeners = new Map<VaultEventName, Set<VaultRenameCallback>>();
	const linkDestinations = new Map<string, { path: string; basename: string }>();

	linkDestinations.set('boards/demo.md::cards/a', { path: 'cards/a.md', basename: 'a' });
	linkDestinations.set('boards/demo.md::cards/b', { path: 'cards/b.md', basename: 'b' });

	const ensureMetadata = (event: MetadataEventName) => {
		const current = metadataListeners.get(event);
		if (current) return current;
		const next = new Set<MetadataChangedCallback | MetadataDeletedCallback>();
		metadataListeners.set(event, next);
		return next;
	};
	const ensureVault = (event: VaultEventName) => {
		const current = vaultListeners.get(event);
		if (current) return current;
		const next = new Set<VaultRenameCallback>();
		vaultListeners.set(event, next);
		return next;
	};

	return {
		metadataCache: {
			getFirstLinkpathDest: (linkpath, sourcePath) =>
				linkDestinations.get(`${sourcePath}::${linkpath}`) ?? null,
			on: (event, callback) => {
				ensureMetadata(event).add(callback);
			},
			off: (event, callback) => {
				ensureMetadata(event).delete(callback);
			},
			triggerChanged: (path) => {
				for (const callback of ensureMetadata('changed')) {
					(callback as MetadataChangedCallback)({ path }, '', {});
				}
			},
			triggerDeleted: (path) => {
				for (const callback of ensureMetadata('deleted')) {
					(callback as MetadataDeletedCallback)({ path }, null);
				}
			},
		},
		vault: {
			on: (event, callback) => {
				ensureVault(event).add(callback);
			},
			off: (event, callback) => {
				ensureVault(event).delete(callback);
			},
			triggerRename: (path, oldPath) => {
				for (const callback of ensureVault('rename')) {
					callback({ path }, oldPath);
				}
			},
		},
	};
};

void test('buildLinkedCardPathSet collects unique linked card paths from board titles', () => {
	const board = createBoard();
	const app = createFakeApp();

	const paths = buildLinkedCardPathSet(
		app as unknown as import('obsidian').App,
		board,
		'boards/demo.md',
	);

	assert.deepEqual([...paths].sort(), ['cards/a.md', 'cards/b.md']);
});

void test('shouldRefreshCardEventIndicators matches changed and renamed linked card paths', () => {
	const linkedCardPaths = new Set(['cards/a.md']);

	assert.strictEqual(
		shouldRefreshCardEventIndicators('cards/a.md', undefined, linkedCardPaths),
		true,
	);
	assert.strictEqual(
		shouldRefreshCardEventIndicators('cards/new.md', 'cards/a.md', linkedCardPaths),
		true,
	);
	assert.strictEqual(
		shouldRefreshCardEventIndicators('cards/new.md', undefined, linkedCardPaths),
		false,
	);
	assert.strictEqual(
		shouldRefreshCardEventIndicators(undefined, undefined, linkedCardPaths),
		false,
	);
});

void test('registerKanbanCardEventIndicatorRefresh reacts to metadata/vault changes of linked cards', () => {
	const app = createFakeApp();
	const calls: string[] = [];
	let linkedCardPaths = new Set(['cards/a.md']);

	const unregister = registerKanbanCardEventIndicatorRefresh(
		app as unknown as import('obsidian').App,
		() => linkedCardPaths,
		() => {
			calls.push('refresh');
		},
	);

	app.metadataCache.triggerChanged('cards/other.md');
	app.metadataCache.triggerChanged('cards/a.md');
	app.metadataCache.triggerDeleted('cards/a.md');
	app.vault.triggerRename('cards/renamed.md', 'cards/a.md');

	assert.deepEqual(calls, ['refresh', 'refresh', 'refresh']);

	linkedCardPaths = new Set(['cards/b.md']);
	app.metadataCache.triggerChanged('cards/a.md');
	app.metadataCache.triggerChanged('cards/b.md');

	assert.deepEqual(calls, ['refresh', 'refresh', 'refresh', 'refresh']);

	unregister();
	app.metadataCache.triggerChanged('cards/b.md');
	assert.deepEqual(calls, ['refresh', 'refresh', 'refresh', 'refresh']);
});
