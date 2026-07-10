import { shouldRefreshGanttData } from '../../services/refresh-service.ts';
import type { App, TAbstractFile } from 'obsidian';
import { assert, test } from 'vitest';

const createFile = (path: string): TAbstractFile => {
	const segments = path.split('/');
	const fileName = segments.at(-1) ?? '';
	const parentPath = segments.slice(0, -1).join('/');
	return {
		path,
		basename: fileName.replace(/\.md$/i, ''),
		parent: parentPath ? { path: parentPath } : null,
	} as unknown as TAbstractFile;
};

const createApp = (boardPaths: string[]): App => {
	const boards = new Set(boardPaths);
	return {
		metadataCache: {
			getFileCache: (file: TAbstractFile) => ({
				frontmatter: boards.has(file.path) ? { 'kanban-plugin': 'board' } : {},
			}),
		},
	} as unknown as App;
};

void test('shouldRefreshGanttData ignores unrelated shallow files and preserves live discovery paths', () => {
	const app = createApp(['boards/new.md', 'deep/1/2/3/4/5/board.md']);
	const dependencyPaths = new Set(['boards/known.md', 'cards/known.md']);
	const decide = (
		event: 'create' | 'modify' | 'delete' | 'rename' | 'metadata',
		file: TAbstractFile,
		oldPath?: string,
	) =>
		shouldRefreshGanttData({
			app,
			file,
			event,
			oldPath,
			calendarFolderPath: 'calendar/',
			maxDepth: 5,
			dependencyPaths,
		});

	assert.strictEqual(decide('modify', createFile('notes/unrelated.md')), false);
	assert.strictEqual(decide('delete', createFile('notes/unrelated.md')), false);
	assert.strictEqual(decide('metadata', createFile('boards/new.md')), true);
	assert.strictEqual(decide('metadata', createFile('deep/1/2/3/4/5/board.md')), false);
	assert.strictEqual(decide('modify', createFile('cards/known.md')), true);
	assert.strictEqual(decide('rename', createFile('boards/renamed.md'), 'boards/known.md'), true);
	assert.strictEqual(decide('create', createFile('notes/new-card.md')), true);
	assert.strictEqual(decide('create', createFile('calendar/archive/1/2/3/4/5/new-event.md')), true);
});
