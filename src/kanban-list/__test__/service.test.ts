import { collectKanbanBoards } from '../services/model-service.ts';
import { assert, test } from 'vitest';

type MockFile = {
	path: string;
	basename: string;
	parent: { path: string } | null;
	stat: { mtime: number };
};

const createFile = (path: string, mtime: number): MockFile => {
	const segments = path.split('/');
	const fileName = segments[segments.length - 1] ?? '';
	const basename = fileName.replace(/\.md$/i, '');
	const parentPath = segments.slice(0, -1).join('/');
	return {
		path,
		basename,
		parent: parentPath ? { path: parentPath } : null,
		stat: { mtime },
	};
};

void test('collectKanbanBoards filters by depth, resolves colors, and sorts deterministically', async () => {
	const files = [
		createFile('board-cached.md', 200),
		createFile('folder/fallback.md', 150),
		createFile('folder/normal.md', 300),
		createFile('alpha.md', 100),
		createFile('zeta.md', 100),
		createFile('deep/nested/board.md', 400),
	];

	const cacheByPath: Record<string, { frontmatter?: Record<string, unknown> } | undefined> = {
		'board-cached.md': {
			frontmatter: {
				'kanban-plugin': 'board',
				'kanban-color': '#1a2b3c',
			},
		},
		'folder/fallback.md': undefined,
		'folder/normal.md': {
			frontmatter: {
				title: 'normal note',
			},
		},
		'alpha.md': {
			frontmatter: {
				'kanban-plugin': 'board',
			},
		},
		'zeta.md': {
			frontmatter: {
				'kanban-plugin': 'board',
			},
		},
		'deep/nested/board.md': {
			frontmatter: {
				'kanban-plugin': 'board',
			},
		},
	};

	const markdownByPath: Record<string, string> = {
		'folder/fallback.md': [
			'---',
			'kanban-plugin: board',
			'KANBAN-COLOR: "#abc"',
			'---',
			'# fallback',
		].join('\n'),
	};

	const app = {
		vault: {
			getMarkdownFiles: () => files,
			cachedRead: (file: MockFile) => Promise.resolve(markdownByPath[file.path] ?? ''),
		},
		metadataCache: {
			getFileCache: (file: MockFile) => cacheByPath[file.path],
		},
	};

	const items = await collectKanbanBoards(app as never, 1);
	assert.strictEqual(items.length, 4);
	assert.deepEqual(
		items.map((item) => item.path),
		['board-cached.md', 'folder/fallback.md', 'alpha.md', 'zeta.md'],
	);
	assert.strictEqual(items[0]?.kanbanColor, '#1A2B3C');
	assert.strictEqual(items[1]?.kanbanColor, '#AABBCC');
	assert.strictEqual(items[2]?.kanbanColor, undefined);
	assert.strictEqual(items[3]?.kanbanColor, undefined);
});
