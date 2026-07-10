import {
	buildCardDerivedState,
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
				cards: [
					{ id: 'card-1', title: 'First card', blockId: 'block-1' },
					{ id: 'card-2', title: 'Second card' },
				],
			},
			{
				id: 'lane-b',
				title: 'Done',
				cards: [{ id: 'card-3', title: 'Done card', blockId: 'block-3' }],
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

void test('buildCardDerivedState resolves each card link once while building all indexes', () => {
	const resolvedTitles: string[] = [];
	const derivedState = buildCardDerivedState(createBoard(), (title) => {
		resolvedTitles.push(title);
		if (title === 'Second card') return null;
		return {
			path: `Cards/${title}.md`,
			hasEvent: title === 'Done card',
		};
	});

	assert.deepEqual([...resolvedTitles].sort(), ['Done card', 'First card', 'Second card']);
	assert.strictEqual(derivedState.titleById.get('card-1'), 'First card');
	assert.strictEqual(derivedState.hasEventById.get('card-1'), false);
	assert.strictEqual(derivedState.hasEventById.get('card-3'), true);
	assert.deepEqual(Array.from(derivedState.linkedPaths).sort(), [
		'Cards/Done card.md',
		'Cards/First card.md',
	]);
});
