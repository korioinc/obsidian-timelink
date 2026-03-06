/* eslint-disable import/no-nodejs-modules */
import { isKanbanBoard } from '../services/parser-service.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('isKanbanBoard detects kanban frontmatter key with flexible spacing', () => {
	const markdown = ['---', 'kanban-plugin : "board"', '---', '', '## Todo'].join('\n');
	assert.equal(isKanbanBoard(markdown), true);
});

void test('isKanbanBoard rejects non-board values when key exists', () => {
	const markdown = ['---', 'kanban-plugin: true', '---', '', '## Todo'].join('\n');
	assert.equal(isKanbanBoard(markdown), false);
});

void test('isKanbanBoard returns false when key is absent', () => {
	const markdown = ['---', 'title: note', '---', '', '# Note'].join('\n');
	assert.equal(isKanbanBoard(markdown), false);
});
