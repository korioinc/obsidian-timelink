import { SerialTaskQueue } from '../../shared/utils/serial-task-queue.ts';
import { persistBoardMutation } from '../services/board-mutation-service.ts';
import type { KanbanBoard } from '../types.ts';
import { assert, expect, test, vi } from 'vitest';

const createBoard = (title: string): KanbanBoard => ({
	settings: {},
	lanes: [{ id: 'lane-1', title, cards: [] }],
});

void test('persistBoardMutation keeps the next board after persistence succeeds', async () => {
	const previous = createBoard('Before');
	const next = createBoard('After');
	let board: KanbanBoard | null = previous;
	const persistedBoards: Array<KanbanBoard | null> = [];

	const applied = await persistBoardMutation(
		{
			getBoard: () => board,
			setBoard: (value) => {
				board = value;
			},
			persist: () => {
				persistedBoards.push(board);
				return Promise.resolve();
			},
		},
		() => next,
	);

	assert.strictEqual(applied, true);
	assert.strictEqual(board, next);
	assert.deepEqual(persistedBoards, [next]);
});

void test('persistBoardMutation restores the previous board when persistence fails', async () => {
	const previous = createBoard('Before');
	const next = createBoard('After');
	let board: KanbanBoard | null = previous;

	await expect(
		persistBoardMutation(
			{
				getBoard: () => board,
				setBoard: (value) => {
					board = value;
				},
				persist: () => Promise.reject(new Error('persist failed')),
			},
			() => next,
		),
	).rejects.toThrow('persist failed');

	assert.strictEqual(board, previous);
});

void test('the serial queue prevents a late failure from rolling back a newer mutation', async () => {
	const initial = createBoard('Initial');
	let board: KanbanBoard | null = initial;
	let rejectFirstSave: (error: Error) => void = () => undefined;
	let persistCalls = 0;
	const context = {
		getBoard: () => board,
		setBoard: (value: KanbanBoard | null) => {
			board = value;
		},
		persist: () => {
			persistCalls += 1;
			if (persistCalls === 1) {
				return new Promise<void>((_resolve, reject) => {
					rejectFirstSave = reject;
				});
			}
			return Promise.resolve();
		},
	};
	const queue = new SerialTaskQueue();
	const first = queue.run(() => persistBoardMutation(context, () => createBoard('First')));
	const second = queue.run(() => persistBoardMutation(context, () => createBoard('Second')));

	await vi.waitFor(() => assert.strictEqual(board?.lanes[0]?.title, 'First'));
	assert.strictEqual(persistCalls, 1);
	rejectFirstSave(new Error('first save failed'));
	await expect(first).rejects.toThrow('first save failed');
	await expect(second).resolves.toBe(true);

	assert.strictEqual(persistCalls, 2);
	assert.strictEqual(board?.lanes[0]?.title, 'Second');
});
