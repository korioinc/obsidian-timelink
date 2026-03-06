/* eslint-disable import/no-nodejs-modules */
import {
	beginDragFromPopoverFactory,
	createDragCaptureHandlers,
	handleDragEndFactory,
	handleDragStartFactory,
	handleDropFactory,
} from '../../services/interaction/drag.ts';
import type { CalendarEvent, EventSegment } from '../../types';
import assert from 'node:assert/strict';
import test from 'node:test';

const createSegment = (
	eventOverrides: Partial<CalendarEvent> = {},
	segmentOverrides: Partial<EventSegment> = {},
): EventSegment => {
	const baseEvent: CalendarEvent = {
		title: 'Sample event',
		allDay: true,
		date: '2026-03-01',
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

void test('handleDragStartFactory normalizes base dates and fallback hover key', () => {
	let nextHover: string | null = null;
	let capturedStart: string | null = null;
	let capturedEnd: string | null = null;
	let capturedDate: string | undefined;
	let capturedEndDate: string | null | undefined;
	const didDropRef = { current: true };
	const segment = createSegment(
		{ date: undefined, startDate: '2026-03-02' },
		{ start: '2026-03-02', end: '2026-03-03', span: 2 },
	);

	const handleDragStart = handleDragStartFactory(
		(next) => {
			capturedStart = next.start;
			capturedEnd = next.end;
			capturedDate = next.event.date;
			capturedEndDate = next.event.endDate;
		},
		(next) => {
			nextHover = next;
		},
		didDropRef,
		() => null,
	);

	handleDragStart(
		{
			clientX: 200,
			clientY: 100,
			dataTransfer: null,
			currentTarget: null,
		} as DragEvent,
		segment,
	);

	assert.equal(capturedStart, '2026-03-02');
	assert.equal(capturedEnd, '2026-03-03');
	assert.equal(capturedDate, '2026-03-02');
	assert.equal(capturedEndDate, '2026-03-03');
	assert.equal(nextHover, '2026-03-02');
	assert.equal(didDropRef.current, false);
});

void test('handleDropFactory updates movable event and clears drag state', () => {
	const segment = createSegment(
		{ date: '2026-03-01', endDate: '2026-03-02' },
		{ start: '2026-03-01', end: '2026-03-02', span: 2 },
	);
	const didDropRef = { current: false };
	let clearedDragging: EventSegment | null = segment;
	let clearedHover: string | null = '2026-03-04';
	let previousDate: string | undefined;
	let nextDate: string | undefined;
	let nextEndDate: string | null | undefined;

	const handleDrop = handleDropFactory(
		() => segment,
		(next) => {
			clearedDragging = next;
		},
		(next) => {
			clearedHover = next;
		},
		(next, previous) => {
			previousDate = previous[0].date;
			nextDate = next[0].date;
			nextEndDate = next[0].endDate;
		},
		didDropRef,
	);

	handleDrop('2026-03-04');

	assert.equal(didDropRef.current, true);
	assert.equal(clearedDragging, null);
	assert.equal(clearedHover, null);
	assert.equal(previousDate, '2026-03-01');
	assert.equal(nextDate, '2026-03-04');
	assert.equal(nextEndDate, '2026-03-05');
});

void test('handleDropFactory does not move event without date', () => {
	const segment = createSegment(
		{ date: undefined, startDate: '2026-03-01', endDate: undefined },
		{ start: '2026-03-01', end: '2026-03-01', span: 1 },
	);
	const didDropRef = { current: false };
	let moved = false;
	let clearedDragging: EventSegment | null = segment;
	let clearedHover: string | null = '2026-03-01';

	const handleDrop = handleDropFactory(
		() => segment,
		(next) => {
			clearedDragging = next;
		},
		(next) => {
			clearedHover = next;
		},
		() => {
			moved = true;
		},
		didDropRef,
	);

	handleDrop('2026-03-03');

	assert.equal(didDropRef.current, true);
	assert.equal(moved, false);
	assert.equal(clearedDragging, null);
	assert.equal(clearedHover, null);
});

void test('handleDragEndFactory drops when hover date changed and no drop fired', () => {
	let droppedTo: string | null = null;
	let clearedDragging: EventSegment | null = createSegment();
	let clearedHover: string | null = '2026-03-04';
	const didDropRef = { current: false };
	const popoverDragRef = { current: true };

	const handleDragEnd = handleDragEndFactory(
		() => createSegment({ date: '2026-03-01' }, { start: '2026-03-01' }),
		() => '2026-03-04',
		(dateKey) => {
			droppedTo = dateKey;
		},
		(next) => {
			clearedDragging = next;
		},
		(next) => {
			clearedHover = next;
		},
		didDropRef,
		popoverDragRef,
	);

	handleDragEnd();

	assert.equal(droppedTo, '2026-03-04');
	assert.notEqual(clearedDragging, null);
	assert.notEqual(clearedHover, null);
	assert.equal(popoverDragRef.current, true);
});

void test('beginDragFromPopoverFactory initializes drag state from popover source', () => {
	let nextHover: string | null = null;
	let capturedStart: string | null = null;
	let capturedEnd: string | null = null;
	let createDragImageCalls = 0;
	const didDropRef = { current: true };
	const popoverDragRef = { current: false };
	const segment = createSegment({ date: '2026-03-01', endDate: '2026-03-03' });

	const beginDrag = beginDragFromPopoverFactory(
		(next) => {
			capturedStart = next.start;
			capturedEnd = next.end;
		},
		(next) => {
			nextHover = next;
		},
		didDropRef,
		popoverDragRef,
		() => {
			createDragImageCalls += 1;
		},
	);

	beginDrag({} as DragEvent, segment);

	assert.equal(capturedStart, '2026-03-01');
	assert.equal(capturedEnd, '2026-03-03');
	assert.equal(nextHover, '2026-03-01');
	assert.equal(didDropRef.current, false);
	assert.equal(popoverDragRef.current, true);
	assert.equal(createDragImageCalls, 1);
});

void test('createDragCaptureHandlers updates hover and forwards drop key', () => {
	let hovered: string | null = null;
	let dropped: string | null = null;
	const dragging = createSegment();
	const handlers = createDragCaptureHandlers(
		() => dragging,
		(clientX) => (clientX > 300 ? '2026-03-05' : null),
		(next) => {
			hovered = next;
		},
		(next) => {
			dropped = next;
		},
	);
	let prevented = 0;
	const event = {
		clientX: 400,
		clientY: 200,
		preventDefault: () => {
			prevented += 1;
		},
	} as DragEvent;

	handlers.handleDragOverCapture(event);
	handlers.handleDragEnterCapture(event);
	handlers.handleDropCapture(event);

	assert.equal(prevented, 3);
	assert.equal(hovered, '2026-03-05');
	assert.equal(dropped, '2026-03-05');
});
