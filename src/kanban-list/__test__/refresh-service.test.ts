import { shouldRefreshKanbanList } from '../services/refresh-service.ts';
import type { App, TAbstractFile } from 'obsidian';
import { assert, test } from 'vitest';

const createFile = (path: string): TAbstractFile => {
	const segments = path.split('/');
	const fileName = segments.at(-1) ?? '';
	const parentPath = segments.slice(0, -1).join('/');
	return {
		path,
		basename: fileName.replace(/\.[^.]+$/i, ''),
		extension: fileName.split('.').at(-1) ?? '',
		parent: parentPath ? { path: parentPath } : null,
	} as unknown as TAbstractFile;
};

const createFolder = (path: string): TAbstractFile =>
	({ path, parent: null }) as unknown as TAbstractFile;

const createApp = (markersByPath: Record<string, unknown>): App =>
	({
		metadataCache: {
			getFileCache: (file: TAbstractFile) => ({
				frontmatter: { 'kanban-plugin': markersByPath[file.path] },
			}),
		},
	}) as unknown as App;

void test('shouldRefreshKanbanList ignores unrelated files and keeps board discovery complete', () => {
	const app = createApp({
		'boards/new.md': 'board',
		'boards/legacy.md': 'legacy',
		'deep/1/2/3/4/5/board.md': 'board',
	});
	const boardPaths = new Set(['boards/existing.md']);
	const decide = (file: TAbstractFile, oldPath?: string) =>
		shouldRefreshKanbanList({ app, file, oldPath, maxDepth: 5, boardPaths });

	assert.strictEqual(decide(createFile('notes/unrelated.md')), false);
	assert.strictEqual(decide(createFile('assets/image.png')), false);
	assert.strictEqual(decide(createFile('boards/new.md')), true);
	assert.strictEqual(decide(createFile('boards/legacy.md')), false);
	assert.strictEqual(decide(createFile('deep/1/2/3/4/5/board.md')), false);
	assert.strictEqual(decide(createFile('boards/existing.md')), true);
	assert.strictEqual(decide(createFile('boards/renamed.md'), 'boards/existing.md'), true);
	assert.strictEqual(decide(createFolder('boards')), true);
	assert.strictEqual(
		decide(createFolder('a/b/c/d/e/f/boards'), 'boards'),
		true,
		'moving an in-scope folder beyond the depth limit must remove its stale boards',
	);
});
