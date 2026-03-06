import {
	buildKanbanViewState,
	parseBoardStateFromViewData,
	resolveKanbanViewMode,
} from '../services/view-composition-service.ts';
import { assert, test } from 'vitest';

void test('parseBoardStateFromViewData returns null for non-kanban markdown', () => {
	const markdown = ['---', 'title: note', '---', '', '# Note'].join('\n');
	assert.strictEqual(
		parseBoardStateFromViewData({
			app: {} as never,
			file: null,
			data: markdown,
			boardColorProperty: 'kanban-color',
		}),
		null,
	);
});

void test('resolveKanbanViewMode returns fallback for unknown values', () => {
	assert.strictEqual(resolveKanbanViewMode('unknown', 'board'), 'board');
	assert.strictEqual(resolveKanbanViewMode(undefined, 'list'), 'list');
});

void test('resolveKanbanViewMode keeps supported modes', () => {
	assert.strictEqual(resolveKanbanViewMode('board', 'list'), 'board');
	assert.strictEqual(resolveKanbanViewMode('table', 'board'), 'table');
	assert.strictEqual(resolveKanbanViewMode('list', 'table'), 'list');
});

void test('buildKanbanViewState includes file path only when provided', () => {
	const withFile = buildKanbanViewState({ foo: 1 }, 'Boards/work.md', 'board');
	assert.deepEqual(withFile, { foo: 1, file: 'Boards/work.md', viewMode: 'board' });

	const withoutFile = buildKanbanViewState({ foo: 1 }, undefined, 'list');
	assert.deepEqual(withoutFile, { foo: 1, viewMode: 'list' });
});
