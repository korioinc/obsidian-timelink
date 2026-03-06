import { shiftDateByViewMode } from '../../../shared/event/model-utils.ts';
import { assert, test } from 'vitest';

void test('shiftDateByViewMode moves one month in month mode', () => {
	const date = new Date(2026, 2, 15);
	const next = shiftDateByViewMode(date, 'month', 'next');
	const prev = shiftDateByViewMode(date, 'month', 'prev');

	assert.strictEqual(next.getFullYear(), 2026);
	assert.strictEqual(next.getMonth(), 3);
	assert.strictEqual(next.getDate(), 15);
	assert.strictEqual(prev.getMonth(), 1);
});

void test('shiftDateByViewMode moves seven days in week mode', () => {
	const date = new Date(2026, 2, 15);
	const next = shiftDateByViewMode(date, 'week', 'next');
	const prev = shiftDateByViewMode(date, 'week', 'prev');

	assert.strictEqual(next.getDate(), 22);
	assert.strictEqual(prev.getDate(), 8);
});

void test('shiftDateByViewMode moves seven days in list mode', () => {
	const date = new Date(2026, 2, 15);
	const next = shiftDateByViewMode(date, 'list', 'next');
	const prev = shiftDateByViewMode(date, 'list', 'prev');

	assert.strictEqual(next.getDate(), 22);
	assert.strictEqual(prev.getDate(), 8);
});

void test('shiftDateByViewMode moves one day in day mode', () => {
	const date = new Date(2026, 2, 15);
	const next = shiftDateByViewMode(date, 'day', 'next');
	const prev = shiftDateByViewMode(date, 'day', 'prev');

	assert.strictEqual(next.getDate(), 16);
	assert.strictEqual(prev.getDate(), 14);
});
