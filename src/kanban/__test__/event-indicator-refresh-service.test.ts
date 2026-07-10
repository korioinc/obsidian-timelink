import {
	registerKanbanCardEventIndicatorRefresh,
	shouldRefreshCardEventIndicators,
} from '../services/event-indicator-refresh-service.ts';
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
type FakeEventRef = { unregister: () => void };

type FakeApp = {
	metadataCache: {
		on: (
			event: MetadataEventName,
			callback: MetadataChangedCallback | MetadataDeletedCallback,
		) => FakeEventRef;
		offref: (eventRef: FakeEventRef) => void;
		triggerChanged: (path: string) => void;
		triggerDeleted: (path: string) => void;
	};
	vault: {
		on: (event: VaultEventName, callback: VaultRenameCallback) => FakeEventRef;
		offref: (eventRef: FakeEventRef) => void;
		triggerRename: (path: string, oldPath: string) => void;
	};
};

const createFakeApp = (): FakeApp => {
	const metadataListeners = new Map<
		MetadataEventName,
		Set<MetadataChangedCallback | MetadataDeletedCallback>
	>();
	const vaultListeners = new Map<VaultEventName, Set<VaultRenameCallback>>();

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
			on: (event, callback) => {
				ensureMetadata(event).add(callback);
				return {
					unregister: () => {
						ensureMetadata(event).delete(callback);
					},
				};
			},
			offref: (eventRef) => {
				eventRef.unregister();
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
				return {
					unregister: () => {
						ensureVault(event).delete(callback);
					},
				};
			},
			offref: (eventRef) => {
				eventRef.unregister();
			},
			triggerRename: (path, oldPath) => {
				for (const callback of ensureVault('rename')) {
					callback({ path }, oldPath);
				}
			},
		},
	};
};

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
