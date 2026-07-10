import { buildKanbanRootActionHandlers } from '../services/view-action-service.ts';
import type { KanbanViewServiceContext } from '../services/view-service-context.ts';
import type { KanbanBoard, KanbanRootActionHandlers } from '../types.ts';
import { afterEach, assert, beforeEach, expect, test, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	notices: [] as string[],
}));

vi.mock('../../shared/services/notice-service.ts', () => ({
	createNotice: () => (message: string) => {
		harness.notices.push(message);
	},
}));

const createBoard = (): KanbanBoard => ({
	settings: {},
	lanes: [
		{
			id: 'lane-1',
			title: 'Todo',
			cards: [{ id: 'card-1', title: 'Task' }],
		},
	],
});

const createContext = (
	applyBoardMutation: KanbanViewServiceContext['applyBoardMutation'],
	removeCardFromSourceBoard = vi.fn(() => Promise.resolve(true)),
): KanbanViewServiceContext => {
	const board = createBoard();
	return {
		app: {
			metadataCache: {
				getFirstLinkpathDest: () => null,
				getFileCache: () => ({ frontmatter: {} }),
			},
			fileManager: {
				generateMarkdownLink: () => '[[Boards/Board#^block]]',
			},
		} as never,
		getFile: () => ({ path: 'Boards/Board.md', basename: 'Board' }) as never,
		getBoard: () => board,
		setBoard: vi.fn(),
		persist: () => Promise.resolve(),
		render: vi.fn(),
		syncHeaderButtons: vi.fn(),
		getCardTitle: () => 'Task',
		calendar: null,
		getTodayDateKey: () => '2026-07-11',
		applyBoardMutation,
		removeCardFromSourceBoard,
		boardColorProperty: 'kanban-color',
		cardEventProperty: 'timelink-event',
		eventCardProperty: 'timelink-card',
	};
};

beforeEach(() => {
	harness.notices.length = 0;
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

void test('editor mutation rejects after reporting a failed false result', async () => {
	const context = createContext(() => Promise.resolve(false));
	const handlers = buildKanbanRootActionHandlers(context, vi.fn());

	await expect(handlers.onAddCard('lane-1', 'New card')).rejects.toThrow();

	assert.deepEqual(harness.notices, ['Failed to add card.']);
	assert.strictEqual(vi.mocked(console.error).mock.calls.length, 1);
});

void test.each<[string, string, (handlers: KanbanRootActionHandlers) => Promise<void>]>([
	['add list', 'Failed to add list.', (handlers) => handlers.onAddLane('New list')],
	['add card', 'Failed to add card.', (handlers) => handlers.onAddCard('lane-1', 'New card')],
	[
		'update list',
		'Failed to update list.',
		(handlers) => handlers.onUpdateLaneTitle('lane-1', 'Next'),
	],
	[
		'update card',
		'Failed to update card.',
		(handlers) => handlers.onUpdateCardTitle('card-1', 'Next'),
	],
])('editor action rejects false mutation result: %s', async (_name, message, invoke) => {
	const handlers = buildKanbanRootActionHandlers(
		createContext(() => Promise.resolve(false)),
		vi.fn(),
	);

	await expect(invoke(handlers)).rejects.toThrow();
	assert.deepEqual(harness.notices, [message]);
});

void test.each<[string, string, (handlers: KanbanRootActionHandlers) => Promise<void>]>([
	['remove list', 'Failed to remove list.', (handlers) => handlers.onRemoveLane('lane-1')],
	['reorder lists', 'Failed to reorder lists.', (handlers) => handlers.onReorderLanes(['lane-1'])],
	['remove card', 'Failed to remove card.', (handlers) => handlers.onRemoveCard('card-1')],
	['move card', 'Failed to move card.', (handlers) => handlers.onMoveCard('card-1', 'lane-1', 0)],
])('background action absorbs false mutation result: %s', async (_name, message, invoke) => {
	const handlers = buildKanbanRootActionHandlers(
		createContext(() => Promise.resolve(false)),
		vi.fn(),
	);

	await expect(invoke(handlers)).resolves.toBeUndefined();
	assert.deepEqual(harness.notices, [message]);
});

void test('background move failure is reported and absorbed', async () => {
	const context = createContext(() => Promise.reject(new Error('persist failed')));
	const handlers = buildKanbanRootActionHandlers(context, vi.fn());

	await expect(handlers.onMoveCard('card-1', 'lane-1', 0)).resolves.toBeUndefined();

	assert.deepEqual(harness.notices, ['Failed to move card.']);
	assert.strictEqual(vi.mocked(console.error).mock.calls.length, 1);
});

void test('cross-board move keeps the source card when target persistence is not confirmed', async () => {
	const removeSource = vi.fn(() => Promise.resolve(true));
	const context = createContext(() => Promise.resolve(false), removeSource);
	const handlers = buildKanbanRootActionHandlers(context, vi.fn());

	await expect(
		handlers.onMoveCardFromOtherBoard(
			{
				sourceBoardPath: 'Boards/Source.md',
				cardId: 'source-card',
				fromLaneId: 'source-lane',
				fromIndex: 0,
				title: 'Moved card',
			},
			'lane-1',
			0,
		),
	).resolves.toBeUndefined();

	assert.strictEqual(removeSource.mock.calls.length, 0);
	assert.deepEqual(harness.notices, ['Failed to move card.']);
});

void test('cross-board move reports a source removal false result without rejecting', async () => {
	const removeSource = vi.fn(() => Promise.resolve(false));
	const context = createContext(() => Promise.resolve(true), removeSource);
	const handlers = buildKanbanRootActionHandlers(context, vi.fn());

	await expect(
		handlers.onMoveCardFromOtherBoard(
			{
				sourceBoardPath: 'Boards/Source.md',
				cardId: 'source-card',
				fromLaneId: 'source-lane',
				fromIndex: 0,
				title: 'Moved card',
			},
			'lane-1',
			0,
		),
	).resolves.toBeUndefined();

	assert.strictEqual(removeSource.mock.calls.length, 1);
	assert.deepEqual(harness.notices, [
		'Card moved, but source card removal failed. Remove it manually if duplicated.',
	]);
	assert.strictEqual(vi.mocked(console.error).mock.calls.length, 1);
});

void test('copy link does not write to clipboard when block id persistence is not confirmed', async () => {
	const writeText = vi.fn(() => Promise.resolve());
	vi.stubGlobal('navigator', { clipboard: { writeText } });
	const context = createContext(() => Promise.resolve(false));
	const handlers = buildKanbanRootActionHandlers(context, vi.fn());

	handlers.onCopyCardLink('card-1');

	await vi.waitFor(() => assert.deepEqual(harness.notices, ['Failed to copy card link.']));
	assert.strictEqual(writeText.mock.calls.length, 0);
});

void test('copy link reports success only after the clipboard write completes', async () => {
	let finishWrite: () => void = () => undefined;
	const writeText = vi.fn(
		() =>
			new Promise<void>((resolve) => {
				finishWrite = resolve;
			}),
	);
	vi.stubGlobal('navigator', { clipboard: { writeText } });
	const context = createContext(() => Promise.resolve(true));
	const handlers = buildKanbanRootActionHandlers(context, vi.fn());

	handlers.onCopyCardLink('card-1');
	await vi.waitFor(() => assert.strictEqual(writeText.mock.calls.length, 1));
	assert.deepEqual(harness.notices, []);

	finishWrite();
	await vi.waitFor(() => assert.deepEqual(harness.notices, ['Card link copied to clipboard.']));
});
