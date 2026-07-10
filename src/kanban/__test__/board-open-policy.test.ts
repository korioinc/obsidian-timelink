import {
	inspectKanbanBoardFile,
	readCachedKanbanMarker,
	resolveKanbanOpenDecision,
} from '../services/board-open-policy.ts';
import { assert, test } from 'vitest';

void test('open action is allowed only for the exact cached board marker', () => {
	assert.strictEqual(
		resolveKanbanOpenDecision(
			'md',
			readCachedKanbanMarker({ frontmatter: { 'kanban-plugin': 'board' } }),
		),
		'allow',
	);
	assert.strictEqual(
		resolveKanbanOpenDecision(
			'md',
			readCachedKanbanMarker({ frontmatter: { 'kanban-plugin': true } }),
		),
		'deny',
	);
	assert.strictEqual(resolveKanbanOpenDecision('md', null), 'inspect');
	assert.strictEqual(resolveKanbanOpenDecision('txt', true), 'deny');
});

void test('uncached file inspection accepts only Markdown with the exact board marker', async () => {
	assert.strictEqual(
		await inspectKanbanBoardFile('md', null, () =>
			Promise.resolve('---\nkanban-plugin: board\n---\n\n## Todo\n'),
		),
		true,
	);
	assert.strictEqual(
		await inspectKanbanBoardFile('md', null, () => Promise.resolve('# Ordinary note\n')),
		false,
	);
});
