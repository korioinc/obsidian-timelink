import { createTimedEventSegment as createSegment } from '../../../shared/__test__/helpers/event-factories.ts';
import {
	buildTimedPlacementsForDays,
	deriveNowIndicator,
	deriveTimedPlacementDays,
} from '../../utils/day-week-grid.ts';
import { assert, test } from 'vitest';

void test('buildTimedPlacementsForDays maps single-day placement to provided dayOffset', () => {
	const segment = createSegment({ date: '2026-03-01', startTime: '09:00', endTime: '10:00' });
	const placements = buildTimedPlacementsForDays({
		days: [{ dayKey: '2026-03-01', dayOffset: 0 }],
		segments: [segment],
		timedResizing: null,
		timedResizeRange: null,
		timedDragging: null,
		timedDragRange: null,
	});

	assert.strictEqual(placements.length, 1);
	assert.strictEqual(placements[0]?.dayOffset, 0);
	assert.strictEqual(placements[0]?.startMinutes, 9 * 60);
	assert.strictEqual(placements[0]?.endMinutes, 10 * 60);
});

void test('buildTimedPlacementsForDays expands cross-day timed event across mapped offsets', () => {
	const segment = createSegment(
		{ date: '2026-03-01', endDate: '2026-03-02', startTime: '23:00', endTime: '01:00' },
		{ end: '2026-03-02', span: 2 },
	);
	const placements = buildTimedPlacementsForDays({
		days: [
			{ dayKey: '2026-03-01', dayOffset: 0 },
			{ dayKey: '2026-03-02', dayOffset: 1 },
		],
		segments: [segment],
		timedResizing: null,
		timedResizeRange: null,
		timedDragging: null,
		timedDragRange: null,
	});

	const dayOffsets = new Set(placements.map((placement) => placement.dayOffset));
	assert.deepEqual(
		[...dayOffsets].sort((a, b) => a - b),
		[0, 1],
	);
});

void test('deriveNowIndicator returns today index and nowTop using slot geometry', () => {
	const dates = [new Date(2026, 2, 1), new Date(2026, 2, 2), new Date(2026, 2, 3)];
	const targetDate = dates[1];
	const now = new Date(2026, 2, 1, 9, 30);
	const indicator = deriveNowIndicator({
		dates,
		isToday: (date) => date === targetDate,
		now,
		slotMinutes: 30,
		slotHeight: 28,
	});

	assert.strictEqual(indicator.todayIndex, 1);
	assert.strictEqual(indicator.showNowIndicator, true);
	assert.strictEqual(indicator.nowTop, 532);
});

void test('deriveNowIndicator hides indicator when no today exists in dates', () => {
	const dates = [new Date(2026, 2, 1)];
	const indicator = deriveNowIndicator({
		dates,
		isToday: () => false,
		now: new Date(2026, 2, 1),
		slotMinutes: 30,
		slotHeight: 28,
	});

	assert.strictEqual(indicator.todayIndex, -1);
	assert.strictEqual(indicator.showNowIndicator, false);
});

void test('deriveTimedPlacementDays maps dates to day keys with offsets', () => {
	const days = deriveTimedPlacementDays([new Date(2026, 2, 1), new Date(2026, 2, 2)]);
	assert.deepEqual(days, [
		{ dayKey: '2026-03-01', dayOffset: 0 },
		{ dayKey: '2026-03-02', dayOffset: 1 },
	]);
});
