/* eslint-disable import/no-nodejs-modules */
import {
	buildKanbanViewState,
	parseBoardStateFromViewData,
	resolveKanbanViewMode,
} from '../services/view-composition-service.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('parseBoardStateFromViewData returns null for non-kanban markdown', () => {
	const markdown = ['---', 'title: note', '---', '', '# Note'].join('\n');
	assert.equal(
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
	assert.equal(resolveKanbanViewMode('unknown', 'board'), 'board');
	assert.equal(resolveKanbanViewMode(undefined, 'list'), 'list');
});

void test('resolveKanbanViewMode keeps supported modes', () => {
	assert.equal(resolveKanbanViewMode('board', 'list'), 'board');
	assert.equal(resolveKanbanViewMode('table', 'board'), 'table');
	assert.equal(resolveKanbanViewMode('list', 'table'), 'list');
});

void test('buildKanbanViewState includes file path only when provided', () => {
	const withFile = buildKanbanViewState({ foo: 1 }, 'Boards/work.md', 'board');
	assert.deepEqual(withFile, { foo: 1, file: 'Boards/work.md', viewMode: 'board' });

	const withoutFile = buildKanbanViewState({ foo: 1 }, undefined, 'list');
	assert.deepEqual(withoutFile, { foo: 1, viewMode: 'list' });
});
