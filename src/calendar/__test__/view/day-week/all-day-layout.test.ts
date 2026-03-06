import { deriveAllDayLayoutMetrics } from '../../../utils/all-day-layout.ts';
import { assert, test } from 'vitest';

void test('deriveAllDayLayoutMetrics keeps at least one row and computes total height', () => {
	const result = deriveAllDayLayoutMetrics({
		eventRows: [],
		weekStartIndex: 0,
		weekEndIndex: 6,
		requestedCapacity: 1,
	});

	assert.strictEqual(result.rowCount, 1);
	assert.strictEqual(result.gridTemplateRows, 'repeat(1, 20px)');
	assert.strictEqual(result.totalHeight, 28);
});

void test('deriveAllDayLayoutMetrics respects minimum row count override', () => {
	const result = deriveAllDayLayoutMetrics({
		eventRows: [],
		weekStartIndex: 0,
		weekEndIndex: 0,
		requestedCapacity: 1,
		minimumRowCount: 2,
	});

	assert.strictEqual(result.rowCount, 2);
	assert.strictEqual(result.gridTemplateRows, 'repeat(2, 20px)');
	assert.strictEqual(result.totalHeight, 50);
});
