import {
	addCard,
	addLane,
	generateBlockId,
	insertCardAt,
	moveCard,
	removeCard,
	removeLane,
	reorderLanesByOrder,
	updateCardTitle,
	updateLaneTitle,
} from '../services/model-service.ts';
import type { KanbanBoard } from '../types.ts';
import { assert, test } from 'vitest';

function createBoard(): KanbanBoard {
	return {
		settings: {},
		lanes: [
			{
				id: 'lane-a',
				title: 'Todo',
				lineStart: 0,
				lineEnd: 0,
				cards: [
					{ id: 'card-1', title: 'First', lineStart: 0 },
					{ id: 'card-2', title: 'Second', lineStart: 1 },
				],
			},
			{
				id: 'lane-b',
				title: 'Done',
				lineStart: 0,
				lineEnd: 0,
				cards: [],
			},
		],
	};
}

void test('insertCardAt clamps index and inserts normalized title', () => {
	const board = createBoard();
	const next = insertCardAt(board, 'lane-b', 999, { title: '  New card\r\nline2  ' });
	assert.strictEqual(next.lanes[1]?.cards.length, 1);
	assert.strictEqual(next.lanes[1]?.cards[0]?.title, 'New card\nline2');
});

void test('moveCard relocates card across lanes at clamped index', () => {
	const board = createBoard();
	const next = moveCard(board, 'card-2', 'lane-b', 999);
	assert.deepEqual(
		next.lanes[0]?.cards.map((card) => card.id),
		['card-1'],
	);
	assert.deepEqual(
		next.lanes[1]?.cards.map((card) => card.id),
		['card-2'],
	);
});

void test('lane and card operations preserve behavior for add/update/remove', () => {
	const board = createBoard();
	const addedLane = addLane(board, 'In review');
	assert.strictEqual(addedLane.lanes.length, 3);

	const updatedLane = updateLaneTitle(addedLane, 'lane-a', 'Todo updated');
	assert.strictEqual(updatedLane.lanes[0]?.title, 'Todo updated');

	const addedCard = addCard(updatedLane, 'lane-b', 'Newly done');
	assert.strictEqual(addedCard.lanes[1]?.cards.length, 1);

	const updatedCard = updateCardTitle(
		addedCard,
		addedCard.lanes[1]?.cards[0]?.id ?? '',
		' Edited ',
	);
	assert.strictEqual(updatedCard.lanes[1]?.cards[0]?.title, 'Edited');

	const removedCard = removeCard(updatedCard, addedCard.lanes[1]?.cards[0]?.id ?? '');
	assert.strictEqual(removedCard.lanes[1]?.cards.length, 0);

	const removedLane = removeLane(removedCard, 'lane-b');
	assert.strictEqual(removedLane.lanes.length, 2);
});

void test('reorderLanesByOrder preserves unspecified lanes at the end', () => {
	const reordered = reorderLanesByOrder(createBoard(), ['lane-b']);
	assert.deepEqual(
		reordered.lanes.map((lane) => lane.id),
		['lane-b', 'lane-a'],
	);
});

void test('generateBlockId returns 6 lowercase alphanumeric characters', () => {
	const blockId = generateBlockId();
	assert.match(blockId, /^[a-z0-9]{6}$/);
});
