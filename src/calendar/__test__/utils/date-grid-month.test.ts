import { formatDateKey } from '../../../shared/event/model-utils.ts';
import { buildMonthGrid } from '../../utils/date-grid.ts';
import { assert, test } from 'vitest';

void test('buildMonthGrid shifts one week earlier when month starts on week start day', () => {
	const grid = buildMonthGrid(2026, 3, 0);
	const firstCell = grid[0];
	const lastCell = grid[grid.length - 1];
	const inMonthCount = grid.filter((cell) => cell.inMonth).length;

	assert.strictEqual(grid.length, 42);
	assert.strictEqual(formatDateKey(firstCell?.date as Date), '2026-02-22');
	assert.strictEqual(formatDateKey(lastCell?.date as Date), '2026-04-04');
	assert.strictEqual(inMonthCount, 31);
	assert.strictEqual(
		grid.some((cell) => formatDateKey(cell.date) === '2026-03-01'),
		true,
	);
	assert.strictEqual(
		grid.some((cell) => formatDateKey(cell.date) === '2026-03-31'),
		true,
	);
});

void test('buildMonthGrid keeps existing alignment when month does not start on week start day', () => {
	const grid = buildMonthGrid(2026, 4, 0);
	const firstCell = grid[0];
	const lastCell = grid[grid.length - 1];

	assert.strictEqual(grid.length, 42);
	assert.strictEqual(formatDateKey(firstCell?.date as Date), '2026-03-29');
	assert.strictEqual(formatDateKey(lastCell?.date as Date), '2026-05-09');
});

void test('buildMonthGrid applies same one-week shift rule for non-Sunday weekStartsOn', () => {
	const grid = buildMonthGrid(2025, 9, 1);
	const firstCell = grid[0];

	assert.strictEqual(grid.length, 42);
	assert.strictEqual(formatDateKey(firstCell?.date as Date), '2025-08-25');
});
