import { getFolderDepth, isPathWithinDepth, isWithinDepth } from '../utils/path.ts';
import { assert, test } from 'vitest';

void test('getFolderDepth handles empty and nested folder paths', () => {
	assert.strictEqual(getFolderDepth(''), 0);
	assert.strictEqual(getFolderDepth('  '), 0);
	assert.strictEqual(getFolderDepth('/'), 0);
	assert.strictEqual(getFolderDepth('kanban'), 1);
	assert.strictEqual(getFolderDepth('projects/kanban/weekly'), 3);
});

void test('isWithinDepth allows root files and rejects files deeper than max depth', () => {
	assert.strictEqual(isWithinDepth({ parent: null }, 0), true);
	assert.strictEqual(isWithinDepth({ parent: { path: '' } }, 0), true);
	assert.strictEqual(isWithinDepth({ parent: { path: 'kanban' } }, 1), true);
	assert.strictEqual(isWithinDepth({ parent: { path: 'kanban/deep' } }, 1), false);
});

void test('isPathWithinDepth handles renamed old path strings', () => {
	assert.strictEqual(isPathWithinDepth('board.md', 0), true);
	assert.strictEqual(isPathWithinDepth('kanban/board.md', 1), true);
	assert.strictEqual(isPathWithinDepth('kanban/deep/board.md', 1), false);
	assert.strictEqual(isPathWithinDepth('', 1), false);
	assert.strictEqual(isPathWithinDepth(undefined, 1), false);
});
