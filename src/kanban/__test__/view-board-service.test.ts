import {
	applyBoardColorChange,
	applyBoardMutation,
	updateBoardSettings,
} from '../services/view-board-service.ts';
import type { KanbanViewBoardServiceContext } from '../services/view-service-context.ts';
import type { KanbanBoard } from '../types.ts';
import { afterEach, assert, beforeEach, expect, test, vi } from 'vitest';

type FileLike = { path: string; basename: string };

const harness = vi.hoisted(() => ({
	eventFiles: [] as FileLike[],
	failedPaths: new Set<string>(),
	notices: [] as string[],
	updates: [] as Array<{ path: string; key: string; color: string | undefined }>,
}));

vi.mock('../../shared/services/notice-service.ts', () => ({
	createNotice: () => (message: string) => {
		harness.notices.push(message);
	},
}));

vi.mock('../services/card-service.ts', () => ({
	collectLinkedEventFiles: () => new Set(harness.eventFiles),
}));

vi.mock('../services/color-service.ts', () => ({
	updateFrontmatterColor: (
		_app: unknown,
		file: FileLike,
		key: string,
		color: string | undefined,
	) => {
		harness.updates.push({ path: file.path, key, color });
		if (harness.failedPaths.has(file.path)) {
			return Promise.reject(new Error(`failed:${file.path}`));
		}
		return Promise.resolve();
	},
}));

beforeEach(() => {
	harness.eventFiles.length = 0;
	harness.failedPaths.clear();
	harness.notices.length = 0;
	harness.updates.length = 0;
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

void test('applyBoardColorChange completes independent linked event updates and reports partial failure', async () => {
	const boardFile: FileLike = { path: 'Boards/Board.md', basename: 'Board' };
	harness.eventFiles.push(
		{ path: 'Events/One.md', basename: 'One' },
		{ path: 'Events/Two.md', basename: 'Two' },
		{ path: 'Events/Three.md', basename: 'Three' },
	);
	harness.failedPaths.add('Events/Two.md');

	let board: KanbanBoard | null = { settings: {}, lanes: [] };
	const lifecycleCalls: string[] = [];
	const context = {
		app: {},
		getFile: () => boardFile,
		getBoard: () => board,
		setBoard: (next: KanbanBoard | null) => {
			board = next;
		},
		persist: () => Promise.resolve(),
		render: () => {
			lifecycleCalls.push('render');
		},
		syncHeaderButtons: () => {
			lifecycleCalls.push('syncHeaderButtons');
		},
		boardColorProperty: 'kanban-color',
		cardEventProperty: 'timelink-event',
	} as unknown as KanbanViewBoardServiceContext;

	await expect(applyBoardColorChange(context, '#abc')).resolves.toBeUndefined();

	assert.deepEqual(
		harness.updates.map(({ path }) => path),
		['Boards/Board.md', 'Events/One.md', 'Events/Two.md', 'Events/Three.md'],
	);
	assert.deepEqual(harness.notices, [
		'Updated 2 linked events.',
		'Failed to update 1 linked event.',
	]);
	assert.deepEqual(lifecycleCalls, ['syncHeaderButtons', 'render']);
	assert.strictEqual(board?.settings['kanban-color'], '#AABBCC');
});

void test('updateBoardSettings preserves persist, header sync, and render order', async () => {
	let board: KanbanBoard | null = { settings: {}, lanes: [] };
	const lifecycleCalls: string[] = [];
	const context = {
		getFile: () => ({ path: 'Boards/Board.md' }),
		getBoard: () => board,
		setBoard: (next: KanbanBoard | null) => {
			board = next;
		},
		persist: () => {
			lifecycleCalls.push('persist');
			return Promise.resolve();
		},
		syncHeaderButtons: () => {
			lifecycleCalls.push('syncHeaderButtons');
		},
		render: () => {
			lifecycleCalls.push('render');
		},
	} as unknown as KanbanViewBoardServiceContext;

	await updateBoardSettings(context, { 'show-add-list': false });

	assert.deepEqual(lifecycleCalls, ['persist', 'syncHeaderButtons', 'render']);
	assert.strictEqual(board?.settings['show-add-list'], false);
});

void test('updateBoardSettings restores the previous board and skips UI sync after failure', async () => {
	const previous: KanbanBoard = { settings: {}, lanes: [] };
	let board: KanbanBoard | null = previous;
	const lifecycleCalls: string[] = [];
	const context = {
		getFile: () => ({ path: 'Boards/Board.md' }),
		getBoard: () => board,
		setBoard: (next: KanbanBoard | null) => {
			board = next;
		},
		persist: () => {
			lifecycleCalls.push('persist');
			return Promise.reject(new Error('persist failed'));
		},
		syncHeaderButtons: () => {
			lifecycleCalls.push('syncHeaderButtons');
		},
		render: () => {
			lifecycleCalls.push('render');
		},
	} as unknown as KanbanViewBoardServiceContext;

	await expect(updateBoardSettings(context, { 'show-add-list': false })).rejects.toThrow(
		'persist failed',
	);

	assert.strictEqual(board, previous);
	assert.deepEqual(lifecycleCalls, ['persist']);
});

void test('applyBoardMutation rerenders the restored board after persistence fails', async () => {
	const previous: KanbanBoard = { settings: {}, lanes: [] };
	let board: KanbanBoard | null = previous;
	const renderedBoards: Array<KanbanBoard | null> = [];
	const context = {
		getFile: () => ({ path: 'Boards/Board.md' }),
		getBoard: () => board,
		setBoard: (next: KanbanBoard | null) => {
			board = next;
		},
		persist: () => Promise.reject(new Error('persist failed')),
		render: () => {
			renderedBoards.push(board);
		},
	} as unknown as KanbanViewBoardServiceContext;

	await expect(
		applyBoardMutation(context, (current) => ({
			...current,
			lanes: [{ id: 'new-lane', title: 'Optimistic', cards: [] }],
		})),
	).rejects.toThrow('persist failed');

	assert.strictEqual(board, previous);
	assert.deepEqual(renderedBoards, [previous]);
});

void test('applyBoardMutation rejects a mutation when the board has no backing file', async () => {
	const board: KanbanBoard = { settings: {}, lanes: [] };
	const persist = vi.fn(() => Promise.resolve());
	const context = {
		getFile: () => null,
		getBoard: () => board,
		setBoard: vi.fn(),
		persist,
		render: vi.fn(),
	} as unknown as KanbanViewBoardServiceContext;

	await expect(applyBoardMutation(context, (current) => current)).resolves.toBe(false);

	assert.strictEqual(persist.mock.calls.length, 0);
	assert.strictEqual(vi.mocked(context.setBoard).mock.calls.length, 0);
	assert.strictEqual(vi.mocked(context.render).mock.calls.length, 0);
});
