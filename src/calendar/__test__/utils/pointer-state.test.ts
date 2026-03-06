import {
	deriveTimeSelectionPointerState,
	deriveTimedPointerState,
} from '../../../shared/event/time-grid-interactions.ts';
import { assert, test } from 'vitest';

const rect = {
	left: 100,
	top: 200,
	width: 700,
	height: 560,
};

void test('deriveTimedPointerState resolves single-day date key and snapped minutes', () => {
	const state = deriveTimedPointerState({
		clientX: 500,
		clientY: 280,
		rect,
		dateKeys: ['2026-03-01'],
		slotHeight: 28,
		slotMinutes: 30,
	});

	assert.ok(state);
	assert.strictEqual(state.dateKey, '2026-03-01');
	assert.strictEqual(state.minutes, 60);
});

void test('deriveTimedPointerState resolves week column date key', () => {
	const state = deriveTimedPointerState({
		clientX: 350,
		clientY: 340,
		rect,
		dateKeys: [
			'2026-03-01',
			'2026-03-02',
			'2026-03-03',
			'2026-03-04',
			'2026-03-05',
			'2026-03-06',
			'2026-03-07',
		],
		slotHeight: 28,
		slotMinutes: 30,
	});

	assert.ok(state);
	assert.strictEqual(state.dateKey, '2026-03-03');
	assert.strictEqual(state.minutes, 150);
});

void test('deriveTimedPointerState returns null when width is zero', () => {
	const state = deriveTimedPointerState({
		clientX: 120,
		clientY: 220,
		rect: { ...rect, width: 0 },
		dateKeys: ['2026-03-01'],
		slotHeight: 28,
		slotMinutes: 30,
	});

	assert.strictEqual(state, null);
});

void test('deriveTimeSelectionPointerState returns date key and grid-snapped minutes', () => {
	const state = deriveTimeSelectionPointerState({
		clientX: 760,
		clientY: 310,
		rect,
		dateKeys: [
			'2026-03-01',
			'2026-03-02',
			'2026-03-03',
			'2026-03-04',
			'2026-03-05',
			'2026-03-06',
			'2026-03-07',
		],
		slotHeight: 28,
	});

	assert.ok(state);
	assert.strictEqual(state.dateKey, '2026-03-07');
	assert.strictEqual(state.minutes, 90);
});
