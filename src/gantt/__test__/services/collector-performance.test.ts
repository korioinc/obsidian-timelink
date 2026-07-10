import { collectGanttBoardSchedules } from '../../services/model-service.ts';
import { assert, test, vi } from 'vitest';

type MockFile = {
	path: string;
	basename: string;
	parent: { path: string } | null;
	stat: { mtime: number };
};

const createFile = (path: string): MockFile => {
	const fileName = path.split('/').at(-1) ?? '';
	return {
		path,
		basename: fileName.replace(/\.md$/i, ''),
		parent: { path: 'boards' },
		stat: { mtime: 0 },
	};
};

const EMPTY_BOARD_MARKDOWN = ['---', 'kanban-plugin: board', '---', '', '## Planned'].join('\n');

void test('collectGanttBoardSchedules reads boards concurrently with a small upper bound', async () => {
	const boardFiles = Array.from({ length: 6 }, (_, index) =>
		createFile(`boards/board-${index + 1}.md`),
	);
	const filesByPath = new Map(boardFiles.map((file) => [file.path, file]));
	const startedPaths: string[] = [];
	let activeReads = 0;
	let maxActiveReads = 0;
	let releaseReads: () => void = () => undefined;
	const readGate = new Promise<void>((resolve) => {
		releaseReads = resolve;
	});
	const app = {
		vault: {
			getMarkdownFiles: () => boardFiles,
			getAbstractFileByPath: (path: string) => filesByPath.get(path) ?? null,
			cachedRead: async (file: MockFile) => {
				startedPaths.push(file.path);
				activeReads += 1;
				maxActiveReads = Math.max(maxActiveReads, activeReads);
				await readGate;
				activeReads -= 1;
				return EMPTY_BOARD_MARKDOWN;
			},
		},
		metadataCache: {
			getFileCache: () => ({
				frontmatter: { 'kanban-plugin': 'board' },
			}),
			getFirstLinkpathDest: () => null,
		},
	};

	const collection = collectGanttBoardSchedules({
		app,
		calendarFolderPath: 'calendar',
		maxDepth: 5,
	});
	await vi.waitFor(() => assert.ok(startedPaths.length > 0));
	await Promise.resolve();
	const initiallyStartedCount = startedPaths.length;
	releaseReads();
	const boards = await collection;

	assert.strictEqual(boards.length, 6);
	assert.deepEqual(
		boards.map((board) => board.path),
		boardFiles.map((file) => file.path),
	);
	assert.ok(initiallyStartedCount > 1);
	assert.ok(initiallyStartedCount <= 4);
	assert.strictEqual(maxActiveReads, initiallyStartedCount);
	assert.strictEqual(new Set(startedPaths).size, 6);
});
