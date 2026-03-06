import { canMoveEvent } from '../../../../shared/event/event-sync.ts';
import type { CalendarEvent, EventSegment } from '../../../types';
import { assert, test } from 'vitest';

const createSegment = (
	eventOverrides: Partial<CalendarEvent> = {},
	segmentOverrides: Partial<EventSegment> = {},
): EventSegment => {
	const baseEvent: CalendarEvent = {
		title: 'Sample event',
		allDay: false,
		date: '2026-03-01',
		startTime: '09:00',
		endTime: '10:00',
	};
	const event = { ...baseEvent, ...eventOverrides };
	const start = event.date ?? event.startDate ?? '2026-03-01';
	const end = event.endDate ?? start;
	return {
		id: 'segment-1',
		event,
		location: {
			file: { path: 'calendar/sample.md' },
			lineNumber: undefined,
		},
		start,
		end,
		span: 1,
		startIndex: 0,
		endIndex: 0,
		...segmentOverrides,
	};
};

void test('canMoveEvent returns true when event has date', () => {
	const segment = createSegment({ date: '2026-03-01' });
	assert.strictEqual(canMoveEvent(segment.event), true);
});

void test('canMoveEvent returns false when event has no date', () => {
	const segment = createSegment({ date: undefined, startDate: '2026-03-01' });
	assert.strictEqual(canMoveEvent(segment.event), false);
});
