/* eslint-disable import/no-nodejs-modules */
import { getFolderDepth, isPathWithinDepth, isWithinDepth } from '../utils/path.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('getFolderDepth handles empty and nested folder paths', () => {
	assert.equal(getFolderDepth(''), 0);
	assert.equal(getFolderDepth('  '), 0);
	assert.equal(getFolderDepth('/'), 0);
	assert.equal(getFolderDepth('kanban'), 1);
	assert.equal(getFolderDepth('projects/kanban/weekly'), 3);
});

void test('isWithinDepth allows root files and rejects files deeper than max depth', () => {
	assert.equal(isWithinDepth({ parent: null }, 0), true);
	assert.equal(isWithinDepth({ parent: { path: '' } }, 0), true);
	assert.equal(isWithinDepth({ parent: { path: 'kanban' } }, 1), true);
	assert.equal(isWithinDepth({ parent: { path: 'kanban/deep' } }, 1), false);
});

void test('isPathWithinDepth handles renamed old path strings', () => {
	assert.equal(isPathWithinDepth('board.md', 0), true);
	assert.equal(isPathWithinDepth('kanban/board.md', 1), true);
	assert.equal(isPathWithinDepth('kanban/deep/board.md', 1), false);
	assert.equal(isPathWithinDepth('', 1), false);
	assert.equal(isPathWithinDepth(undefined, 1), false);
});
