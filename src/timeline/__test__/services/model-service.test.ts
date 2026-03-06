/* eslint-disable import/no-nodejs-modules */
import type {
	EditableEventResponse,
	EventLocation,
	CalendarEvent,
} from '../../../shared/event/types';
import { TIMELINE_SLOT_HEIGHT, TIMELINE_SLOT_MINUTES } from '../../constants.ts';
import {
	buildTimelineDayModel,
	buildTimelineHeaderTitle,
	buildTimelineTimedVisualModel,
} from '../../services/model-service.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

const createLocation = (path: string): EventLocation => ({
	file: { path },
	lineNumber: undefined,
});

const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
	title: 'Event',
	allDay: false,
	date: '2026-03-02',
	taskEvent: true,
	...overrides,
});

const createEntry = (
	eventOverrides: Partial<CalendarEvent>,
	path: string,
): EditableEventResponse => [createEvent(eventOverrides), createLocation(path)];

void test('buildTimelineHeaderTitle prepends today marker only for current day', () => {
	const todayTitle = buildTimelineHeaderTitle(new Date());
	assert.equal(todayTitle.startsWith('🟢 '), true);

	const nonToday = new Date();
	nonToday.setDate(nonToday.getDate() - 2);
	const nonTodayTitle = buildTimelineHeaderTitle(nonToday);
	assert.equal(nonTodayTitle.startsWith('🟢 '), false);
});

void test('buildTimelineDayModel derives day key and unscheduled tasks for current day', () => {
	const entries: EditableEventResponse[] = [
		createEntry({ title: 'Task without time' }, 'calendar/no-time.md'),
		createEntry(
			{ title: 'Timed event', startTime: '09:00', endTime: '10:00' },
			'calendar/timed.md',
		),
	];

	const model = buildTimelineDayModel(entries, new Date(2026, 2, 2));
	assert.equal(model.dayKey, '2026-03-02');
	assert.equal(model.eventSegments.length, 2);
	assert.deepEqual(
		model.unscheduledTasks.map((segment) => segment.event.title),
		['Task without time'],
	);
});

void test('buildTimelineTimedVisualModel derives timed placements and now indicator', () => {
	const today = new Date();
	const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
		today.getDate(),
	).padStart(2, '0')}`;
	const entries: EditableEventResponse[] = [
		createEntry(
			{
				title: 'Timed event',
				date: todayKey,
				endDate: todayKey,
				startTime: '09:00',
				endTime: '10:00',
			},
			'calendar/timed.md',
		),
	];
	const dayModel = buildTimelineDayModel(entries, today);

	const visuals = buildTimelineTimedVisualModel({
		eventSegments: dayModel.eventSegments,
		dayKey: dayModel.dayKey,
		dayDate: dayModel.dayCell.date,
		timedResizing: null,
		timedResizeRange: null,
		timedDragging: null,
		timedDragRange: null,
		now: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
		slotMinutes: TIMELINE_SLOT_MINUTES,
		slotHeight: TIMELINE_SLOT_HEIGHT,
	});

	assert.equal(visuals.timedEventsForDay.length, 1);
	assert.equal(visuals.showNowIndicator, true);
	assert.equal(visuals.nowTop, 798);
});
