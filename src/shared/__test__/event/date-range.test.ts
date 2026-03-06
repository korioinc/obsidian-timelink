import {
	getShiftedDateRange,
	isDateKeyInRange,
	resolveNormalizedEventDateRange,
} from '../../event/date-range.ts';
import type { CalendarEvent } from '../../event/types.ts';
import { assert, test } from 'vitest';

const createEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
	title: 'Event',
	allDay: false,
	taskEvent: true,
	date: '2026-03-03',
	startTime: '09:00',
	endTime: '10:00',
	...overrides,
});

void test('resolveNormalizedEventDateRange returns null when date is missing', () => {
	const range = resolveNormalizedEventDateRange(createEvent({ date: undefined }));
	assert.strictEqual(range, null);
});

void test('resolveNormalizedEventDateRange treats next-day 00:00 as exclusive for timed events', () => {
	const range = resolveNormalizedEventDateRange(
		createEvent({
			date: '2026-03-03',
			endDate: '2026-03-04',
			endTime: '00:00',
			allDay: false,
		}),
	);
	assert.deepEqual(range, { startKey: '2026-03-03', endKey: '2026-03-03' });
});

void test('resolveNormalizedEventDateRange clamps end key when end is before start', () => {
	const range = resolveNormalizedEventDateRange(
		createEvent({
			date: '2026-03-05',
			endDate: '2026-03-01',
		}),
	);
	assert.deepEqual(range, { startKey: '2026-03-05', endKey: '2026-03-05' });
});

void test('getShiftedDateRange keeps span while moving to target start key', () => {
	const shifted = getShiftedDateRange('2026-03-03', '2026-03-05', '2026-03-10');
	assert.deepEqual(shifted, { start: '2026-03-10', end: '2026-03-12' });
});

void test('isDateKeyInRange includes boundaries and excludes outside keys', () => {
	const range = { startKey: '2026-03-03', endKey: '2026-03-05' };
	assert.strictEqual(isDateKeyInRange('2026-03-03', range), true);
	assert.strictEqual(isDateKeyInRange('2026-03-05', range), true);
	assert.strictEqual(isDateKeyInRange('2026-03-06', range), false);
});
