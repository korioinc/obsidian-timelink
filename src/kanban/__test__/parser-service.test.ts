import {
	isKanbanBoard,
	parseKanbanBoard,
	serializeKanbanBoard,
} from '../services/parser-service.ts';
import { assert, test } from 'vitest';

void test('isKanbanBoard detects kanban frontmatter key with flexible spacing', () => {
	const markdown = ['---', 'kanban-plugin : "board"', '---', '', '## Todo'].join('\n');
	assert.strictEqual(isKanbanBoard(markdown), true);
});

void test('isKanbanBoard rejects non-board values when key exists', () => {
	const markdown = ['---', 'kanban-plugin: true', '---', '', '## Todo'].join('\n');
	assert.strictEqual(isKanbanBoard(markdown), false);
});

void test('isKanbanBoard returns false when key is absent', () => {
	const markdown = ['---', 'title: note', '---', '', '# Note'].join('\n');
	assert.strictEqual(isKanbanBoard(markdown), false);
});

void test('serializeKanbanBoard preserves markdown that is not owned by board lanes', () => {
	const markdown =
		[
			'---',
			'kanban-plugin: board',
			'custom-property: keep-me',
			'---',
			'',
			'# Board context',
			'Keep this introduction.',
			'',
			'## Todo',
			'',
			'- [ ] First card',
			'',
			'Keep this note between lanes.',
			'',
			'## Done',
			'',
			'- [ ] Finished card',
			'',
			'Keep this appendix.',
		].join('\n') + '\n';
	const board = parseKanbanBoard(markdown);
	const firstCard = board.lanes[0]?.cards[0];
	assert.ok(firstCard);
	firstCard.title = 'Updated card';

	const serialized = serializeKanbanBoard(board, markdown);

	assert.include(serialized, 'custom-property: keep-me');
	assert.include(serialized, '# Board context\nKeep this introduction.');
	assert.include(serialized, 'Keep this note between lanes.');
	assert.include(serialized, 'Keep this appendix.');
	assert.include(serialized, '- [ ] Updated card');
	assert.isBelow(serialized.indexOf('Keep this introduction.'), serialized.indexOf('## Todo'));
	assert.isBelow(
		serialized.indexOf('- [ ] Updated card'),
		serialized.indexOf('Keep this note between lanes.'),
	);
	assert.isBelow(
		serialized.indexOf('Keep this note between lanes.'),
		serialized.indexOf('## Done'),
	);
	assert.isBelow(
		serialized.indexOf('- [ ] Finished card'),
		serialized.indexOf('Keep this appendix.'),
	);
});
