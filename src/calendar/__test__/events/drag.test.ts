import {
	beginDragFromPopoverFactory,
	createDragCaptureHandlers,
	createDragImage,
	handleDragEndFactory,
	handleDragStartFactory,
	handleDropFactory,
} from '../../services/interaction/drag.ts';
import type { CalendarEvent, EventSegment } from '../../types';
import { afterEach, assert, test, vi } from 'vitest';

afterEach(() => {
	vi.unstubAllGlobals();
});

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

	assert.strictEqual(capturedStart, '2026-03-02');
	assert.strictEqual(capturedEnd, '2026-03-03');
	assert.strictEqual(capturedDate, '2026-03-02');
	assert.strictEqual(capturedEndDate, '2026-03-03');
	assert.strictEqual(nextHover, '2026-03-02');
	assert.strictEqual(didDropRef.current, false);
});

void test('handleDragStartFactory uses inferred overnight end date for timed events without endDate', () => {
	let capturedStart: string | null = null;
	let capturedEnd: string | null = null;
	let capturedEndDate: string | null | undefined;
	const didDropRef = { current: true };
	const segment = createSegment(
		{
			allDay: false,
			date: '2026-06-12',
			startTime: '20:00',
			endTime: '01:01',
		},
		{ start: '2026-06-12', end: '2026-06-12', span: 1 },
	);

	const handleDragStart = handleDragStartFactory(
		(next) => {
			capturedStart = next.start;
			capturedEnd = next.end;
			capturedEndDate = next.event.endDate;
		},
		() => undefined,
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

	assert.strictEqual(capturedStart, '2026-06-12');
	assert.strictEqual(capturedEnd, '2026-06-13');
	assert.strictEqual(capturedEndDate, '2026-06-13');
});

void test('dragging a multi-day event preserves the grabbed-day offset', () => {
	const segment = createSegment(
		{ date: '2026-03-01', endDate: '2026-03-03' },
		{ start: '2026-03-01', end: '2026-03-03', span: 3 },
	);
	let dragging: EventSegment | null = null;
	let dragHoverDateKey: string | null = null;
	let droppedTo: string | null = null;
	const didDropRef = { current: false };
	const popoverDragRef = { current: false };
	const dragAnchorOffsetDaysRef = { current: 0 };

	const handleDragStart = handleDragStartFactory(
		(next) => {
			dragging = next;
		},
		(next) => {
			dragHoverDateKey = next;
		},
		didDropRef,
		() => '2026-03-02',
		dragAnchorOffsetDaysRef,
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

	assert.strictEqual(dragAnchorOffsetDaysRef.current, 1);
	assert.strictEqual(dragHoverDateKey, '2026-03-01');

	const handleDragEnd = handleDragEndFactory(
		() => dragging,
		() => dragHoverDateKey,
		(dateKey) => {
			droppedTo = dateKey;
		},
		(next) => {
			dragging = next;
		},
		(next) => {
			dragHoverDateKey = next;
		},
		didDropRef,
		popoverDragRef,
	);
	handleDragEnd();

	assert.strictEqual(droppedTo, null);
	assert.strictEqual(dragging, null);
});

void test('drag capture applies the grabbed-day offset to hover and drop dates', () => {
	const segment = createSegment(
		{ date: '2026-03-01', endDate: '2026-03-03' },
		{ start: '2026-03-01', end: '2026-03-03', span: 3 },
	);
	let dragHoverDateKey: string | null = null;
	let droppedTo: string | null = null;
	const handlers = createDragCaptureHandlers(
		() => segment,
		() => '2026-03-03',
		(next) => {
			dragHoverDateKey = next;
		},
		(dateKey) => {
			droppedTo = dateKey;
		},
		{ current: 1 },
	);
	const event = {
		clientX: 100,
		clientY: 100,
		preventDefault: () => undefined,
	} as DragEvent;

	handlers.handleDragOverCapture(event);
	assert.strictEqual(dragHoverDateKey, '2026-03-02');

	handlers.handleDropCapture(event);
	assert.strictEqual(droppedTo, '2026-03-02');
});

void test('createDragImage appends compact label preview to the target document', () => {
	const segment = createSegment(
		{
			title: 'Deep work',
			startTime: '09:30',
			color: '#abcdef',
			completed: true,
		},
		{ span: 4 },
	);
	const classes = new Set<string>();
	const cssProps: Record<string, string> = {};
	let removed = false;
	const preview = {
		classList: {
			add: (...classNames: string[]) => {
				for (const className of classNames) {
					classes.add(className);
				}
			},
		},
		setCssProps: (props: Record<string, string>) => {
			Object.assign(cssProps, props);
		},
		remove: () => {
			removed = true;
		},
		textContent: '',
	} as unknown as HTMLElement;
	let appended: HTMLElement | null = null;
	let createdTagName: string | null = null;
	const ownerDocument = {
		createElement: (tagName: string) => {
			createdTagName = tagName;
			return preview;
		},
		body: {
			appendChild: (element: HTMLElement) => {
				appended = element;
				return element;
			},
		},
		defaultView: {
			setTimeout: (callback: () => void): number => {
				callback();
				return 0;
			},
		},
	} as unknown as Document;
	let cloneCalled = false;
	const target = {
		ownerDocument,
		cloneNode: () => {
			cloneCalled = true;
			return {};
		},
	} as unknown as HTMLElement;
	let dataTransferType: string | null = null;
	let dataTransferValue: string | null = null;
	let dragImage: HTMLElement | null = null;
	let offsetX: number | null = null;
	let offsetY: number | null = null;
	const dataTransfer = {
		effectAllowed: 'none',
		setData: (type: string, value: string) => {
			dataTransferType = type;
			dataTransferValue = value;
		},
		setDragImage: (image: HTMLElement, x: number, y: number) => {
			dragImage = image;
			offsetX = x;
			offsetY = y;
		},
	} as unknown as DataTransfer;

	createDragImage(
		{
			clientX: 500,
			clientY: 200,
			currentTarget: target,
			dataTransfer,
		} as unknown as DragEvent,
		segment,
	);

	assert.strictEqual(dataTransfer.effectAllowed, 'move');
	assert.strictEqual(dataTransferType, 'text/plain');
	assert.strictEqual(dataTransferValue, segment.id);
	assert.strictEqual(createdTagName, 'div');
	assert.strictEqual(appended, preview);
	assert.strictEqual(dragImage, preview);
	assert.strictEqual(cloneCalled, false);
	assert.strictEqual(offsetX, 12);
	assert.strictEqual(offsetY, 12);
	assert.strictEqual(preview.textContent, '09:30 Deep work');
	assert.strictEqual(classes.has('timelink-drag-preview'), true);
	assert.strictEqual(classes.has('timelink-drag-preview-label'), true);
	assert.strictEqual(classes.has('timelink-drag-preview-completed'), true);
	assert.strictEqual(cssProps['--timelink-drag-preview-color'], '#abcdef');
	assert.strictEqual(removed, true);
});

void test('createDragImage uses fallback label for blank event titles', () => {
	const segment = createSegment({ title: '   ', startTime: '   ', color: '   ' });
	const preview = {
		classList: {
			add: () => undefined,
		},
		setCssProps: () => undefined,
		remove: () => undefined,
		textContent: '',
	} as unknown as HTMLElement;
	const ownerDocument = {
		createElement: () => preview,
		body: {
			appendChild: (element: HTMLElement) => element,
		},
		defaultView: {
			setTimeout: (callback: () => void): number => {
				callback();
				return 0;
			},
		},
	} as unknown as Document;
	const dataTransfer = {
		effectAllowed: 'none',
		setData: () => undefined,
		setDragImage: () => undefined,
	} as unknown as DataTransfer;

	createDragImage(
		{
			clientX: 0,
			clientY: 0,
			currentTarget: { ownerDocument } as HTMLElement,
			dataTransfer,
		} as unknown as DragEvent,
		segment,
	);

	assert.strictEqual(preview.textContent, 'Untitled event');
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

	assert.strictEqual(didDropRef.current, true);
	assert.strictEqual(clearedDragging, null);
	assert.strictEqual(clearedHover, null);
	assert.strictEqual(previousDate, '2026-03-01');
	assert.strictEqual(nextDate, '2026-03-04');
	assert.strictEqual(nextEndDate, '2026-03-05');
});

void test('handleDropFactory preserves next-day midnight timed boundary while moving event', () => {
	const segment = createSegment(
		{
			allDay: false,
			date: '2026-06-05',
			startTime: '21:00',
			endDate: '2026-06-06',
			endTime: '00:00',
		},
		{ start: '2026-06-05', end: '2026-06-05', span: 1 },
	);
	const didDropRef = { current: false };
	let nextDate: string | undefined;
	let nextEndDate: string | null | undefined;
	let nextEndTime: string | null | undefined;

	const handleDrop = handleDropFactory(
		() => segment,
		() => undefined,
		() => undefined,
		(next) => {
			nextDate = next[0].date;
			nextEndDate = next[0].endDate;
			nextEndTime = next[0].endTime;
		},
		didDropRef,
	);

	handleDrop('2026-06-08');

	assert.strictEqual(nextDate, '2026-06-08');
	assert.strictEqual(nextEndDate, '2026-06-09');
	assert.strictEqual(nextEndTime, '00:00');
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

	assert.strictEqual(didDropRef.current, true);
	assert.strictEqual(moved, false);
	assert.strictEqual(clearedDragging, null);
	assert.strictEqual(clearedHover, null);
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

	assert.strictEqual(droppedTo, '2026-03-04');
	assert.strictEqual(clearedDragging, null);
	assert.strictEqual(clearedHover, null);
	assert.strictEqual(didDropRef.current, false);
	assert.strictEqual(popoverDragRef.current, false);
});

void test('beginDragFromPopoverFactory initializes drag state from popover source', () => {
	let nextHover: string | null = null;
	let capturedStart: string | null = null;
	let capturedEnd: string | null = null;
	let createDragImageCalls = 0;
	const didDropRef = { current: true };
	const popoverDragRef = { current: false };
	const dragAnchorOffsetDaysRef = { current: 0 };
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
		dragAnchorOffsetDaysRef,
	);

	beginDrag({} as DragEvent, segment, '2026-03-02');

	assert.strictEqual(capturedStart, '2026-03-01');
	assert.strictEqual(capturedEnd, '2026-03-03');
	assert.strictEqual(nextHover, '2026-03-01');
	assert.strictEqual(dragAnchorOffsetDaysRef.current, 1);
	assert.strictEqual(didDropRef.current, false);
	assert.strictEqual(popoverDragRef.current, true);
	assert.strictEqual(createDragImageCalls, 1);
});

void test('beginDragFromPopoverFactory uses inferred overnight end date for timed events without endDate', () => {
	let capturedStart: string | null = null;
	let capturedEnd: string | null = null;
	let capturedEndDate: string | null | undefined;
	const didDropRef = { current: true };
	const popoverDragRef = { current: false };
	const segment = createSegment(
		{
			allDay: false,
			date: '2026-06-12',
			startTime: '20:00',
			endTime: '01:01',
		},
		{ start: '2026-06-12', end: '2026-06-12', span: 1 },
	);

	const beginDrag = beginDragFromPopoverFactory(
		(next) => {
			capturedStart = next.start;
			capturedEnd = next.end;
			capturedEndDate = next.event.endDate;
		},
		() => undefined,
		didDropRef,
		popoverDragRef,
		() => undefined,
	);

	beginDrag({} as DragEvent, segment);

	assert.strictEqual(capturedStart, '2026-06-12');
	assert.strictEqual(capturedEnd, '2026-06-13');
	assert.strictEqual(capturedEndDate, '2026-06-13');
	assert.strictEqual(popoverDragRef.current, true);
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

	assert.strictEqual(prevented, 3);
	assert.strictEqual(hovered, '2026-03-05');
	assert.strictEqual(dropped, '2026-03-05');
});
