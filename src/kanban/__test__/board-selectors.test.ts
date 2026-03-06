import {
	buildCardEventMap,
	buildCardTitleMap,
	findCardBlockId,
	findCardById,
	hasCard,
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
					{ id: 'card-1', title: 'First card', lineStart: 0, blockId: 'block-1' },
					{ id: 'card-2', title: 'Second card', lineStart: 1 },
				],
			},
			{
				id: 'lane-b',
				title: 'Done',
				lineStart: 0,
				lineEnd: 0,
				cards: [{ id: 'card-3', title: 'Done card', lineStart: 0, blockId: 'block-3' }],
			},
		],
	};
}

void test('findCardById returns card when card exists across lanes', () => {
	const board = createBoard();
	const card = findCardById(board, 'card-3');
	assert.strictEqual(card?.title, 'Done card');
});

void test('findCardById returns null when card does not exist', () => {
	const board = createBoard();
	const card = findCardById(board, 'missing-card');
	assert.strictEqual(card, null);
});

void test('findCardBlockId returns blockId or null', () => {
	const board = createBoard();
	assert.strictEqual(findCardBlockId(board, 'card-1'), 'block-1');
	assert.strictEqual(findCardBlockId(board, 'card-2'), null);
	assert.strictEqual(findCardBlockId(board, 'missing-card'), null);
});

void test('hasCard returns true only when card exists', () => {
	const board = createBoard();
	assert.strictEqual(hasCard(board, 'card-2'), true);
	assert.strictEqual(hasCard(board, 'missing-card'), false);
});

void test('buildCardTitleMap indexes card titles by id', () => {
	const titles = buildCardTitleMap(createBoard());
	assert.strictEqual(titles.get('card-1'), 'First card');
	assert.strictEqual(titles.get('card-3'), 'Done card');
	assert.strictEqual(titles.get('missing'), undefined);
});

void test('buildCardEventMap delegates per-card event check and stores booleans', () => {
	const eventMap = buildCardEventMap(createBoard(), (title) => title.includes('Done'));
	assert.strictEqual(eventMap.get('card-1'), false);
	assert.strictEqual(eventMap.get('card-3'), true);
});
