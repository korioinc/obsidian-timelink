import type { EventSegment } from '../../../shared/event/types';
import { collectUnscheduledTasksForDay } from '../../utils/unscheduled-tasks.ts';
import { assert, test } from 'vitest';

type SegmentOverrides = Omit<Partial<EventSegment>, 'event'> & {
	event?: Partial<EventSegment['event']>;
};

const createSegment = (overrides: SegmentOverrides = {}): EventSegment => {
	const base: EventSegment = {
		id: 'segment-1',
		event: {
			title: 'Untitled',
			allDay: false,
			date: '2026-03-02',
			endDate: '2026-03-02',
			taskEvent: true,
		},
		location: {
			file: { path: 'calendar/day.md' },
			lineNumber: undefined,
		},
		start: '2026-03-02',
		end: '2026-03-02',
		span: 1,
		startIndex: 0,
		endIndex: 0,
	};
	return { ...base, ...overrides, event: { ...base.event, ...overrides.event } };
};

void test('collectUnscheduledTasksForDay includes only no-time tasks inside current day range', () => {
	const sameDayNoTime = createSegment({ id: 'same-day-no-time' });
	const timedTask = createSegment({
		id: 'timed',
		event: {
			startTime: '09:00',
			endTime: '10:00',
		},
	});
	const outOfRange = createSegment({
		id: 'out-of-range',
		start: '2026-03-03',
		end: '2026-03-03',
	});
	const spanningNoTime = createSegment({
		id: 'spanning-no-time',
		start: '2026-03-01',
		end: '2026-03-03',
	});
	const segments = [sameDayNoTime, timedTask, outOfRange, spanningNoTime];

	const result = collectUnscheduledTasksForDay(segments, '2026-03-02');
	assert.deepEqual(
		result.map((segment) => segment.id),
		['same-day-no-time', 'spanning-no-time'],
	);
});
