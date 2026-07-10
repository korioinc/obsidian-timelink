import { resolveKanbanBoardCreation } from '../services/board-creation-policy.ts';
import { assert, test } from 'vitest';

void test.each(['', '   ', '..', '../Escape', 'Nested/Board', 'Nested\\Board'])(
	'board creation rejects an unsafe title: %j',
	(title) => {
		assert.throws(() => resolveKanbanBoardCreation(title, 'Boards', () => null));
	},
);

void test('board creation normalizes the containing folder inside the vault', () => {
	const resolution = resolveKanbanBoardCreation('  Roadmap  ', ' Projects//Current/ ', () => null);

	assert.deepEqual(resolution, {
		kind: 'create',
		title: 'Roadmap',
		path: 'Projects/Current/Roadmap.md',
	});
});

void test('board creation allows harmless repeated dots inside a title', () => {
	assert.deepEqual(
		resolveKanbanBoardCreation('Release..Notes', 'Boards', () => null),
		{
			kind: 'create',
			title: 'Release..Notes',
			path: 'Boards/Release..Notes.md',
		},
	);
});

void test('board creation treats the vault root folder path as the root', () => {
	const resolution = resolveKanbanBoardCreation('Roadmap', ' / ', () => null);

	assert.strictEqual(resolution.path, 'Roadmap.md');
});

void test('board creation rejects a folder path that can escape the vault root', () => {
	assert.throws(() => resolveKanbanBoardCreation('Roadmap', '../Outside', () => null));
});

void test('board creation rejects a collision instead of reusing an existing file', () => {
	assert.throws(() =>
		resolveKanbanBoardCreation('Roadmap', 'Boards', () => ({ path: 'Boards/Roadmap.md' })),
	);
});
