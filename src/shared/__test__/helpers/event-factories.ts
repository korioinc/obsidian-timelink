import type { CalendarEvent, EventModalState, EventSegment } from '../../event/types';

const BASE_ALL_DAY_EVENT: CalendarEvent = {
	title: 'Sample event',
	allDay: true,
	date: '2026-03-01',
};

const BASE_TIMED_EVENT: CalendarEvent = {
	title: 'Sample event',
	allDay: false,
	date: '2026-03-01',
	startTime: '09:00',
	endTime: '10:00',
};

const buildEventSegment = (
	baseEvent: CalendarEvent,
	eventOverrides: Partial<CalendarEvent>,
	segmentOverrides: Partial<EventSegment>,
): EventSegment => {
	const event = { ...baseEvent, ...eventOverrides };
	const start = event.date ?? '2026-03-01';
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

export const createAllDayEventSegment = (
	eventOverrides: Partial<CalendarEvent> = {},
	segmentOverrides: Partial<EventSegment> = {},
): EventSegment => buildEventSegment(BASE_ALL_DAY_EVENT, eventOverrides, segmentOverrides);

export const createTimedEventSegment = (
	eventOverrides: Partial<CalendarEvent> = {},
	segmentOverrides: Partial<EventSegment> = {},
): EventSegment => buildEventSegment(BASE_TIMED_EVENT, eventOverrides, segmentOverrides);

export const createEventModalState = (segment: EventSegment): EventModalState => ({
	segment,
	date: segment.start,
	title: segment.event.title,
	allDay: segment.event.allDay,
	taskEvent: segment.event.taskEvent ?? false,
	isCompleted: Boolean(segment.event.completed),
	startTime: segment.event.startTime ?? '',
	endTime: segment.event.endTime ?? '',
	color: segment.event.color ?? '',
});
