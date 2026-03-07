import {
	buildSingleColumnTimedDragAnchor,
	buildSingleColumnTimedEventRenderModel,
	resolveSingleColumnOverlayState,
} from '../../../shared/event/timed-visual-model.ts';
import type {
	CalendarEvent,
	EventSegment,
	TimeSelectionRange,
	TimedEventPlacement,
} from '../../types';
import { assert, test } from 'vitest';

const createPlacement = (
	eventOverrides: Partial<CalendarEvent> = {},
	segmentOverrides: Partial<EventSegment> = {},
	placementOverrides: Partial<TimedEventPlacement> = {},
): TimedEventPlacement => {
	const event: CalendarEvent = {
		title: 'Focused work',
		allDay: false,
		date: '2026-03-01',
		startTime: '09:00',
		endTime: '10:00',
		...eventOverrides,
	};
	const segment: EventSegment = {
		id: 'segment-1',
		event,
		location: {
			file: { path: 'calendar/work.md' },
			lineNumber: undefined,
		},
		start: '2026-03-01',
		end: '2026-03-01',
		span: 1,
		startIndex: 0,
		endIndex: 0,
		...segmentOverrides,
	};
	return {
		segment,
		dayOffset: 0,
		startMinutes: 9 * 60,
		endMinutes: 10 * 60,
		column: 0,
		columnCount: 1,
		...placementOverrides,
	};
};

const createRange = (overrides: Partial<TimeSelectionRange> = {}): TimeSelectionRange => ({
	startDateKey: '2026-03-01',
	endDateKey: '2026-03-01',
	startMinutes: 9 * 60,
	endMinutes: 10 * 60,
	...overrides,
});

void test('resolveSingleColumnOverlayState returns overlay segments for matching date key', () => {
	const state = resolveSingleColumnOverlayState({
		dateKey: '2026-03-01',
		selectionRange: createRange({ startMinutes: 8 * 60, endMinutes: 9 * 60 }),
		timedResizeRange: createRange(),
		timedDragRange: createRange({ startMinutes: 10 * 60, endMinutes: 11 * 60 }),
	});

	assert.strictEqual(state.selectionSegments.length, 1);
	assert.strictEqual(state.selectionSegments[0]?.startMinutes, 8 * 60);
	assert.strictEqual(state.timedDragSegments.length, 1);
	assert.strictEqual(state.timedDragSegments[0]?.endMinutes, 11 * 60);
	assert.strictEqual(state.showTimedDrag, true);
	assert.deepEqual(state.resizeRangeKeys, { startKey: '2026-03-01', endKey: '2026-03-01' });
});

void test('buildSingleColumnTimedEventRenderModel derives geometry and labels', () => {
	const placement = createPlacement();
	const model = buildSingleColumnTimedEventRenderModel({
		placement,
		dateKey: '2026-03-01',
		slotMinutes: 30,
		slotHeight: 28,
		timedResizeRange: null,
		timedDragRange: null,
		showTimedDrag: false,
		defaultEventColor: '#112233',
		normalizeEventColor: () => null,
		formatTime: (minutes) => `${minutes}`,
	});

	assert.strictEqual(model.draggable, true);
	assert.strictEqual(model.eventColor, '#112233');
	assert.strictEqual(model.left, 0);
	assert.strictEqual(model.width, 100);
	assert.strictEqual(model.startLabel, '540');
	assert.strictEqual(model.endLabel, '600');
	assert.strictEqual(model.visualTop, (540 / 30) * 28);
	assert.strictEqual(model.visualHeight, ((600 - 540) / 30) * 28);
});

void test('buildSingleColumnTimedEventRenderModel clamps drag end label for cross-day drag', () => {
	const placement = createPlacement();
	const model = buildSingleColumnTimedEventRenderModel({
		placement,
		dateKey: '2026-03-01',
		slotMinutes: 30,
		slotHeight: 28,
		timedDraggingId: 'segment-1',
		timedDragRange: createRange({
			startDateKey: '2026-03-01',
			endDateKey: '2026-03-02',
			startMinutes: 10 * 60,
			endMinutes: 30,
		}),
		timedResizeRange: null,
		showTimedDrag: true,
		defaultEventColor: '#112233',
		normalizeEventColor: () => '#ABCDEF',
		formatTime: (minutes) => `${minutes}`,
	});

	assert.strictEqual(model.isDraggingEvent, true);
	assert.strictEqual(model.startLabel, '600');
	assert.strictEqual(model.endLabel, '1440');
});

void test('buildSingleColumnTimedEventRenderModel disables dragging when event has no date', () => {
	const placement = createPlacement({ date: undefined, startDate: '2026-03-01' });
	const model = buildSingleColumnTimedEventRenderModel({
		placement,
		dateKey: '2026-03-01',
		slotMinutes: 30,
		slotHeight: 28,
		timedResizeRange: null,
		timedDragRange: null,
		showTimedDrag: false,
		defaultEventColor: '#112233',
		normalizeEventColor: () => '#ABCDEF',
		formatTime: (minutes) => `${minutes}`,
	});

	assert.strictEqual(model.draggable, false);
});

void test('buildSingleColumnTimedDragAnchor uses the rendered slice start for continuation segments', () => {
	const placement = createPlacement(
		{
			date: '2026-03-08',
			endDate: '2026-03-09',
			startTime: '23:30',
			endTime: '02:10',
		},
		{ start: '2026-03-09', end: '2026-03-09', span: 1 },
		{ startMinutes: 0, endMinutes: 130 },
	);

	assert.deepEqual(buildSingleColumnTimedDragAnchor('2026-03-09', placement), {
		dateKey: '2026-03-09',
		startMinutes: 0,
	});
});
