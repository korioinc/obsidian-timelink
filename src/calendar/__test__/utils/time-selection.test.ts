import {
	getDateKeyFromPointer,
	getMinutesFromPointer,
	getMinutesFromY,
	normalizeTimeSelection,
	snapMinutes,
} from '../../../shared/event/time-grid-interactions.ts';
import { assert, test } from 'vitest';

const rect = {
	left: 100,
	top: 200,
	width: 700,
	height: 560,
} as DOMRect;

void test('getDateKeyFromPointer resolves dynamic columns and clamps boundaries', () => {
	const single = getDateKeyFromPointer(20, rect, ['2026-03-01']);
	const middle = getDateKeyFromPointer(350, rect, [
		'2026-03-01',
		'2026-03-02',
		'2026-03-03',
		'2026-03-04',
		'2026-03-05',
		'2026-03-06',
		'2026-03-07',
	]);
	const right = getDateKeyFromPointer(9999, rect, [
		'2026-03-01',
		'2026-03-02',
		'2026-03-03',
		'2026-03-04',
		'2026-03-05',
		'2026-03-06',
		'2026-03-07',
	]);
	const zeroWidth = getDateKeyFromPointer(300, { ...rect, width: 0 } as DOMRect, ['2026-03-01']);

	assert.strictEqual(single, '2026-03-01');
	assert.strictEqual(middle, '2026-03-03');
	assert.strictEqual(right, '2026-03-07');
	assert.strictEqual(zeroWidth, null);
});

void test('minute helpers snap and clamp pointer values', () => {
	assert.strictEqual(getMinutesFromY(275, rect.top, 28), 60);
	assert.strictEqual(getMinutesFromPointer(275, rect, 28), (75 / 28) * 30);
	assert.strictEqual(snapMinutes(77, 30), 60);
	assert.strictEqual(snapMinutes(2000, 30), 1440);
});

void test('minute helpers support custom step granularity', () => {
	assert.strictEqual(getMinutesFromY(275, rect.top, 28, 10), 20);
	assert.strictEqual(getMinutesFromPointer(275, rect, 28, 10), (75 / 28) * 10);
	assert.strictEqual(snapMinutes(77, 10), 70);
	const range = normalizeTimeSelection(
		{
			isSelecting: true,
			anchorDateKey: '2026-03-01',
			anchorMinutes: 10 * 60,
			hoverDateKey: '2026-03-01',
			hoverMinutes: 10 * 60 + 1,
		},
		10,
	);
	assert.ok(range);
	assert.strictEqual(range.startMinutes, 10 * 60);
	assert.strictEqual(range.endMinutes, 10 * 60 + 10);
});

void test('normalizeTimeSelection enforces minimum 30-minute range', () => {
	const range = normalizeTimeSelection({
		isSelecting: true,
		anchorDateKey: '2026-03-01',
		anchorMinutes: 10 * 60,
		hoverDateKey: '2026-03-01',
		hoverMinutes: 10 * 60 + 10,
	});

	assert.ok(range);
	assert.strictEqual(range.startDateKey, '2026-03-01');
	assert.strictEqual(range.endDateKey, '2026-03-01');
	assert.strictEqual(range.startMinutes, 10 * 60);
	assert.strictEqual(range.endMinutes, 10 * 60 + 30);
});

void test('normalizeTimeSelection clamps midnight anchor to the last valid start slot', () => {
	const range = normalizeTimeSelection({
		isSelecting: true,
		anchorDateKey: '2026-03-01',
		anchorMinutes: 24 * 60,
		hoverDateKey: '2026-03-01',
		hoverMinutes: 24 * 60,
	});

	assert.ok(range);
	assert.strictEqual(range.startDateKey, '2026-03-01');
	assert.strictEqual(range.endDateKey, '2026-03-01');
	assert.strictEqual(range.startMinutes, 23 * 60 + 30);
	assert.strictEqual(range.endMinutes, 24 * 60);
});

void test('normalizeTimeSelection normalizes backward date selection', () => {
	const range = normalizeTimeSelection({
		isSelecting: true,
		anchorDateKey: '2026-03-03',
		anchorMinutes: 10 * 60,
		hoverDateKey: '2026-03-02',
		hoverMinutes: 9 * 60,
	});

	assert.ok(range);
	assert.strictEqual(range.startDateKey, '2026-03-02');
	assert.strictEqual(range.endDateKey, '2026-03-03');
	assert.strictEqual(range.startMinutes, 9 * 60);
	assert.strictEqual(range.endMinutes, 10 * 60);
});

void test('normalizeTimeSelection returns null when anchor or hover is incomplete', () => {
	assert.strictEqual(
		normalizeTimeSelection({
			isSelecting: true,
			anchorDateKey: null,
			anchorMinutes: null,
			hoverDateKey: '2026-03-01',
			hoverMinutes: 600,
		}),
		null,
	);
});
