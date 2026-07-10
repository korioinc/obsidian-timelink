import {
	getDeleteLinkedNoteLabel,
	removeCardWithLinkedCleanup,
} from '../services/card-removal-service.ts';
import type { KanbanBoard } from '../types.ts';
import { assert, test } from 'vitest';

const CARD_EVENT_PROPERTY = 'timelinkEvent';

const createBoard = (title = '[[Cards/Task|Task]]'): KanbanBoard => ({
	settings: {},
	lanes: [
		{
			id: 'lane-1',
			title: 'Todo',
			cards: [{ id: 'card-1', title }],
		},
	],
});

const createFile = (path: string, basename: string) => ({ path, basename });

const createHarness = (
	options: {
		eventLink?: string | null;
		deleteEventError?: boolean;
		trashError?: boolean;
		boardMutation?: 'success' | 'false' | 'throw';
	} = {},
) => {
	let board = createBoard();
	const boardFile = createFile('Boards/Board.md', 'Board');
	const linkedCardFile = createFile('Cards/Task.md', 'Task');
	const linkedEventFile = createFile('Events/2026-03-02 Task.md', '2026-03-02 Task');
	const calls: string[] = [];
	const notices: string[] = [];
	const frontmatterByPath: Record<string, Record<string, unknown>> = {
		[linkedCardFile.path]: {},
	};

	if (options.eventLink) {
		frontmatterByPath[linkedCardFile.path] = {
			[CARD_EVENT_PROPERTY]: options.eventLink,
		};
	}

	const app = {
		metadataCache: {
			getFirstLinkpathDest: (linkPath: string, sourcePath: string) => {
				if (linkPath === 'Cards/Task' && sourcePath === boardFile.path) {
					return linkedCardFile;
				}
				if (linkPath === linkedEventFile.path && sourcePath === linkedCardFile.path) {
					return linkedEventFile;
				}
				return null;
			},
			getFileCache: (file: { path: string }) => ({
				frontmatter: frontmatterByPath[file.path],
			}),
		},
		fileManager: {
			trashFile: (file: { path: string }) => {
				calls.push(`trash:${file.path}`);
				if (options.trashError) {
					return Promise.reject(new Error('trash failed'));
				}
				return Promise.resolve();
			},
		},
	};

	const context = {
		app,
		calendar: {
			getCalendar: () => ({
				createEvent: () => Promise.resolve({ file: { path: linkedEventFile.path } }),
				deleteEvent: (location: { file: { path: string } }) => {
					calls.push(`deleteEvent:${location.file.path}`);
					if (options.deleteEventError) {
						return Promise.reject(new Error('delete event failed'));
					}
					return Promise.resolve();
				},
			}),
		},
		getTodayDateKey: () => '2026-03-02',
		applyBoardMutation: (mutate: (nextBoard: KanbanBoard) => KanbanBoard) => {
			calls.push('removeCard');
			if (options.boardMutation === 'throw') {
				return Promise.reject(new Error('board persist failed'));
			}
			if (options.boardMutation === 'false') {
				return Promise.resolve(false);
			}
			board = mutate(board);
			return Promise.resolve(true);
		},
		cardEventProperty: CARD_EVENT_PROPERTY,
		notice: (message: string) => {
			notices.push(message);
		},
	} as const;

	return {
		context,
		calls,
		notices,
		getBoardFile: () => boardFile,
		getBoard: () => board,
	};
};

const withMutedConsoleError = async (run: () => Promise<void>) => {
	const originalConsoleError = console.error;
	console.error = () => undefined;
	try {
		await run();
	} finally {
		console.error = originalConsoleError;
	}
};

void test('getDeleteLinkedNoteLabel mentions linked event when present', () => {
	assert.strictEqual(getDeleteLinkedNoteLabel(false), 'Also delete linked note');
	assert.strictEqual(getDeleteLinkedNoteLabel(true), 'Also delete linked note and linked event');
});

void test('removeCardWithLinkedCleanup persists card removal before deleting linked artifacts', async () => {
	const harness = createHarness({
		eventLink: '[[Events/2026-03-02 Task.md]]',
	});

	await removeCardWithLinkedCleanup({
		...harness.context,
		board: harness.getBoard(),
		sourceFile: harness.getBoardFile(),
		cardId: 'card-1',
		options: { deleteLinkedNote: true },
	});

	assert.deepEqual(harness.calls, [
		'removeCard',
		'deleteEvent:Events/2026-03-02 Task.md',
		'trash:Cards/Task.md',
	]);
	assert.strictEqual(harness.getBoard().lanes[0]?.cards.length, 0);
	assert.deepEqual(harness.notices, []);
});

void test('removeCardWithLinkedCleanup deletes only the linked note when no linked event exists', async () => {
	const harness = createHarness();

	await removeCardWithLinkedCleanup({
		...harness.context,
		board: harness.getBoard(),
		sourceFile: harness.getBoardFile(),
		cardId: 'card-1',
		options: { deleteLinkedNote: true },
	});

	assert.deepEqual(harness.calls, ['removeCard', 'trash:Cards/Task.md']);
	assert.strictEqual(harness.getBoard().lanes[0]?.cards.length, 0);
	assert.deepEqual(harness.notices, []);
});

void test('removeCardWithLinkedCleanup does not delete artifacts when board persistence fails', async () => {
	const harness = createHarness({
		eventLink: '[[Events/2026-03-02 Task.md]]',
		boardMutation: 'throw',
	});

	await withMutedConsoleError(async () => {
		await removeCardWithLinkedCleanup({
			...harness.context,
			board: harness.getBoard(),
			sourceFile: harness.getBoardFile(),
			cardId: 'card-1',
			options: { deleteLinkedNote: true },
		});
	});

	assert.deepEqual(harness.calls, ['removeCard']);
	assert.strictEqual(harness.getBoard().lanes[0]?.cards.length, 1);
	assert.deepEqual(harness.notices, [
		'Could not confirm card removal. Linked note and event were not deleted.',
	]);
});

void test('removeCardWithLinkedCleanup requires a confirmed board mutation before cleanup', async () => {
	const harness = createHarness({
		eventLink: '[[Events/2026-03-02 Task.md]]',
		boardMutation: 'false',
	});

	await removeCardWithLinkedCleanup({
		...harness.context,
		board: harness.getBoard(),
		sourceFile: harness.getBoardFile(),
		cardId: 'card-1',
		options: { deleteLinkedNote: true },
	});

	assert.deepEqual(harness.calls, ['removeCard']);
	assert.strictEqual(harness.getBoard().lanes[0]?.cards.length, 1);
	assert.deepEqual(harness.notices, [
		'Failed to remove the card. Linked note and event were not deleted.',
	]);
});

void test('removeCardWithLinkedCleanup reports event cleanup failure after removing the card', async () => {
	const harness = createHarness({
		eventLink: '[[Events/2026-03-02 Task.md]]',
		deleteEventError: true,
	});

	await withMutedConsoleError(async () => {
		await removeCardWithLinkedCleanup({
			...harness.context,
			board: harness.getBoard(),
			sourceFile: harness.getBoardFile(),
			cardId: 'card-1',
			options: { deleteLinkedNote: true },
		});
	});

	assert.deepEqual(harness.calls, ['removeCard', 'deleteEvent:Events/2026-03-02 Task.md']);
	assert.strictEqual(harness.getBoard().lanes[0]?.cards.length, 0);
	assert.deepEqual(harness.notices, [
		'Card removed, but failed to delete the linked event. The linked note was not deleted.',
	]);
});

void test('removeCardWithLinkedCleanup reports note cleanup failure after removing the card', async () => {
	const harness = createHarness({
		trashError: true,
	});

	await withMutedConsoleError(async () => {
		await removeCardWithLinkedCleanup({
			...harness.context,
			board: harness.getBoard(),
			sourceFile: harness.getBoardFile(),
			cardId: 'card-1',
			options: { deleteLinkedNote: true },
		});
	});

	assert.deepEqual(harness.calls, ['removeCard', 'trash:Cards/Task.md']);
	assert.strictEqual(harness.getBoard().lanes[0]?.cards.length, 0);
	assert.deepEqual(harness.notices, ['Card removed, but failed to delete the linked note.']);
});

void test('removeCardWithLinkedCleanup reports partial cleanup after event deletion succeeds', async () => {
	const harness = createHarness({
		eventLink: '[[Events/2026-03-02 Task.md]]',
		trashError: true,
	});

	await withMutedConsoleError(async () => {
		await removeCardWithLinkedCleanup({
			...harness.context,
			board: harness.getBoard(),
			sourceFile: harness.getBoardFile(),
			cardId: 'card-1',
			options: { deleteLinkedNote: true },
		});
	});

	assert.deepEqual(harness.calls, [
		'removeCard',
		'deleteEvent:Events/2026-03-02 Task.md',
		'trash:Cards/Task.md',
	]);
	assert.strictEqual(harness.getBoard().lanes[0]?.cards.length, 0);
	assert.deepEqual(harness.notices, [
		'Card and linked event were removed, but failed to delete the linked note.',
	]);
});
