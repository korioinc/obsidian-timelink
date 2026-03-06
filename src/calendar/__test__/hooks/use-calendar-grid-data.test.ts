import { buildDayGrid, deriveDateKeysFromGrid } from '../../hooks/use-calendar-grid-data.ts';
import { assert, test } from 'vitest';

void test('buildDayGrid creates single in-month cell at start of day', () => {
	const currentDate = new Date(2026, 2, 8, 14, 35, 12);
	const grid = buildDayGrid(currentDate);
	assert.strictEqual(grid.length, 1);
	assert.strictEqual(grid[0]?.inMonth, true);
	assert.strictEqual(grid[0]?.date.getFullYear(), 2026);
	assert.strictEqual(grid[0]?.date.getMonth(), 2);
	assert.strictEqual(grid[0]?.date.getDate(), 8);
	assert.strictEqual(grid[0]?.date.getHours(), 0);
	assert.strictEqual(grid[0]?.date.getMinutes(), 0);
});

void test('deriveDateKeysFromGrid maps cells to ISO-like date keys', () => {
	const keys = deriveDateKeysFromGrid([
		{ date: new Date(2026, 2, 1), inMonth: true },
		{ date: new Date(2026, 2, 2), inMonth: true },
		{ date: new Date(2026, 2, 3), inMonth: false },
	]);
	assert.deepEqual(keys, ['2026-03-01', '2026-03-02', '2026-03-03']);
});
