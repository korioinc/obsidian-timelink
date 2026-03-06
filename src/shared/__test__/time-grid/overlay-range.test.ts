import { compareDateKey } from '../../event/model-utils.ts';
import { normalizeDateRangeKeys, resolveRangeBounds } from '../../time-grid/overlay-range.ts';
import { assert, test } from 'vitest';

void test('compareDateKey compares lexicographical date keys', () => {
	assert.strictEqual(compareDateKey('2026-03-01', '2026-03-01'), 0);
	assert.strictEqual(compareDateKey('2026-03-01', '2026-03-02'), -1);
	assert.strictEqual(compareDateKey('2026-03-03', '2026-03-02'), 1);
});

void test('normalizeDateRangeKeys always returns sorted range', () => {
	assert.deepEqual(normalizeDateRangeKeys('2026-03-01', '2026-03-03'), {
		startKey: '2026-03-01',
		endKey: '2026-03-03',
	});
	assert.deepEqual(normalizeDateRangeKeys('2026-03-03', '2026-03-01'), {
		startKey: '2026-03-01',
		endKey: '2026-03-03',
	});
});

void test('resolveRangeBounds clamps partially out-of-range intervals', () => {
	const bounds = resolveRangeBounds(
		['2026-03-01', '2026-03-02', '2026-03-03'],
		'2026-02-28',
		'2026-03-02',
	);
	assert.deepEqual(bounds, { startIndex: 0, endIndex: 1 });
});

void test('resolveRangeBounds returns null when interval is fully outside', () => {
	const before = resolveRangeBounds(
		['2026-03-01', '2026-03-02', '2026-03-03'],
		'2026-02-01',
		'2026-02-10',
	);
	const after = resolveRangeBounds(
		['2026-03-01', '2026-03-02', '2026-03-03'],
		'2026-04-01',
		'2026-04-10',
	);
	assert.strictEqual(before, null);
	assert.strictEqual(after, null);
});
