import { buildTimedDayEntries } from '../../time-grid/timed-events-grid.ts';
import { createTimedEventSegment } from '../helpers/event-factories.ts';
import { assert, test } from 'vitest';

void test('buildTimedDayEntries slices overnight timed event without endDate across affected days', () => {
	const segment = createTimedEventSegment({
		date: '2026-06-12',
		startTime: '20:00',
		endTime: '01:01',
		endDate: undefined,
	});

	const buildForDay = (dayKey: string) =>
		buildTimedDayEntries({
			segments: [segment],
			dayKey,
			dayOffset: 0,
			timedResizing: null,
			timedResizeRange: null,
			timedDragging: null,
			timedDragRange: null,
		}).map((placement) => ({
			startMinutes: placement.startMinutes,
			endMinutes: placement.endMinutes,
		}));

	assert.deepEqual(buildForDay('2026-06-12'), [{ startMinutes: 20 * 60, endMinutes: 24 * 60 }]);
	assert.deepEqual(buildForDay('2026-06-13'), [{ startMinutes: 0, endMinutes: 61 }]);
	assert.deepEqual(buildForDay('2026-06-14'), []);
});

void test('buildTimedDayEntries keeps next-day midnight as an exclusive zero-length tail', () => {
	const segment = createTimedEventSegment({
		date: '2026-06-12',
		endDate: '2026-06-13',
		startTime: '20:00',
		endTime: '00:00',
	});

	const buildForDay = (dayKey: string) =>
		buildTimedDayEntries({
			segments: [segment],
			dayKey,
			dayOffset: 0,
			timedResizing: null,
			timedResizeRange: null,
			timedDragging: null,
			timedDragRange: null,
		});

	assert.deepEqual(
		buildForDay('2026-06-12').map((placement) => ({
			startMinutes: placement.startMinutes,
			endMinutes: placement.endMinutes,
		})),
		[{ startMinutes: 20 * 60, endMinutes: 24 * 60 }],
	);
	assert.deepEqual(buildForDay('2026-06-13'), []);
});

void test('buildTimedDayEntries infers no-endDate midnight tail and hides zero-length next day', () => {
	const segment = createTimedEventSegment({
		date: '2026-06-12',
		endDate: undefined,
		startTime: '20:00',
		endTime: '00:00',
	});

	const buildForDay = (dayKey: string) =>
		buildTimedDayEntries({
			segments: [segment],
			dayKey,
			dayOffset: 0,
			timedResizing: null,
			timedResizeRange: null,
			timedDragging: null,
			timedDragRange: null,
		});

	assert.deepEqual(
		buildForDay('2026-06-12').map((placement) => ({
			startMinutes: placement.startMinutes,
			endMinutes: placement.endMinutes,
		})),
		[{ startMinutes: 20 * 60, endMinutes: 24 * 60 }],
	);
	assert.deepEqual(buildForDay('2026-06-13'), []);
});
