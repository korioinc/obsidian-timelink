import { canMoveEvent } from '../../../shared/event/event-sync';
import {
	DEFAULT_EVENT_COLOR,
	clampEventDate,
	diffInDays,
	normalizeEventColor,
	parseDateKey,
} from '../../../shared/event/model-utils';
import type { EditableEventResponse } from '../../../shared/event/types';
import type { EventSegment } from '../../types';

const DRAG_PREVIEW_OFFSET_X = 12;
const DRAG_PREVIEW_OFFSET_Y = 12;
const UNTITLED_DRAG_PREVIEW_LABEL = 'Untitled event';

const getDragPreviewLabel = (segment: EventSegment): string => {
	const startTime = segment.event.startTime?.trim() ?? '';
	const title = segment.event.title.trim();
	const label = [startTime, title].filter(Boolean).join(' ').trim();
	return label.length > 0 ? label : UNTITLED_DRAG_PREVIEW_LABEL;
};

const createDragPreviewElement = (target: HTMLElement, segment: EventSegment): HTMLElement => {
	const preview = target.ownerDocument.createElement('div');
	preview.classList.add('timelink-drag-preview', 'timelink-drag-preview-label');
	if (segment.event.completed) {
		preview.classList.add('timelink-drag-preview-completed');
	}
	preview.textContent = getDragPreviewLabel(segment);
	preview.setCssProps({
		'--timelink-drag-preview-color':
			normalizeEventColor(segment.event.color) ?? DEFAULT_EVENT_COLOR,
	});
	return preview;
};

export const createDragImage = (event: DragEvent, segment: EventSegment) => {
	if (!event.dataTransfer) return;
	event.dataTransfer.effectAllowed = 'move';
	event.dataTransfer.setData('text/plain', segment.id);
	const target = event.currentTarget as HTMLElement | null;
	if (!target?.ownerDocument?.body) return;
	const preview = createDragPreviewElement(target, segment);
	target.ownerDocument.body.appendChild(preview);
	event.dataTransfer.setDragImage(preview, DRAG_PREVIEW_OFFSET_X, DRAG_PREVIEW_OFFSET_Y);
	const ownerWindow = target.ownerDocument.defaultView ?? window;
	ownerWindow.setTimeout(() => preview.remove(), 0);
};

export const handleDragStartFactory = (
	setDragging: (segment: EventSegment) => void,
	setDragHoverDateKey: (dateKey: string) => void,
	didDropRef: { current: boolean },
	getDateKeyFromPointer: (x: number, y: number) => string | null,
) => {
	return (event: DragEvent, segment: EventSegment) => {
		const baseDate = segment.event.date ?? segment.event.startDate ?? segment.start;
		const baseEndDate = segment.event.endDate ?? null;
		const resolvedEnd = baseEndDate ?? (segment.span > 1 ? segment.end : baseDate);
		setDragging({
			...segment,
			start: baseDate,
			end: resolvedEnd,
			event: {
				...segment.event,
				date: baseDate,
				endDate: baseEndDate ?? (segment.span > 1 ? resolvedEnd : undefined),
			},
		});
		const pointerDateKey = getDateKeyFromPointer(event.clientX, event.clientY);
		setDragHoverDateKey(pointerDateKey ?? segment.start);
		didDropRef.current = false;
		createDragImage(event, segment);
	};
};

export const handleDragEndFactory = (
	getDragging: () => EventSegment | null,
	getDragHoverDateKey: () => string | null,
	handleDrop: (dateKey: string) => void,
	setDragging: (segment: EventSegment | null) => void,
	setDragHoverDateKey: (dateKey: string | null) => void,
	didDropRef: { current: boolean },
	popoverDragRef: { current: boolean },
) => {
	return () => {
		const dragging = getDragging();
		const dragHoverDateKey = getDragHoverDateKey();
		if (
			!didDropRef.current &&
			dragging &&
			dragHoverDateKey &&
			dragHoverDateKey !== dragging.start
		) {
			handleDrop(dragHoverDateKey);
			return;
		}
		didDropRef.current = false;
		setDragging(null);
		setDragHoverDateKey(null);
		popoverDragRef.current = false;
	};
};

export const beginDragFromPopoverFactory = (
	setDragging: (segment: EventSegment) => void,
	setDragHoverDateKey: (dateKey: string) => void,
	didDropRef: { current: boolean },
	popoverDragRef: { current: boolean },
	createDragImageFn: (event: DragEvent, segment: EventSegment) => void,
) => {
	return (event: DragEvent, segment: EventSegment) => {
		const { event: calendarEvent, location } = segment;
		const baseDate = calendarEvent.date ?? calendarEvent.startDate ?? segment.start;
		const baseEnd =
			calendarEvent.endDate ??
			(calendarEvent.startDate && calendarEvent.endDate ? calendarEvent.endDate : null) ??
			segment.end;
		setDragging({
			...segment,
			start: baseDate,
			end: baseEnd ?? baseDate,
			event: {
				...calendarEvent,
				date: baseDate,
				endDate: baseEnd ?? undefined,
			},
			location,
		});
		setDragHoverDateKey(baseDate);
		didDropRef.current = false;
		popoverDragRef.current = true;
		createDragImageFn(event, segment);
	};
};

export const handleDropFactory = (
	getDragging: () => EventSegment | null,
	setDragging: (segment: EventSegment | null) => void,
	setDragHoverDateKey: (dateKey: string | null) => void,
	onMoveEvent: (
		next: EditableEventResponse,
		previous: EditableEventResponse,
	) => Promise<void> | void,
	didDropRef: { current: boolean },
) => {
	return (dateKey: string) => {
		const dragging = getDragging();
		if (!dragging) return;
		didDropRef.current = true;
		if (!canMoveEvent(dragging.event)) {
			setDragging(null);
			setDragHoverDateKey(null);
			return;
		}
		const oldDate = parseDateKey(dragging.start);
		const nextDate = parseDateKey(dateKey);
		const offset = diffInDays(oldDate, nextDate);
		const original: EditableEventResponse = [dragging.event, dragging.location];
		const next = clampEventDate(dragging.event, offset);
		const updated: EditableEventResponse = [next, dragging.location];
		void onMoveEvent(updated, original);
		setDragging(null);
		setDragHoverDateKey(null);
	};
};

const handleDragHoverFromPointer = (
	dragging: EventSegment | null,
	clientX: number,
	clientY: number,
	getDateKeyFromPointer: (x: number, y: number) => string | null,
	setDragHoverDateKey: (dateKey: string) => void,
) => {
	if (!dragging) return;
	const dateKey = getDateKeyFromPointer(clientX, clientY);
	if (dateKey) {
		setDragHoverDateKey(dateKey);
	}
};

export const createDragCaptureHandlers = (
	getDragging: () => EventSegment | null,
	getDateKeyFromPointer: (x: number, y: number) => string | null,
	setDragHoverDateKey: (dateKey: string) => void,
	handleDrop: (dateKey: string) => void,
) => {
	const handleDragOverCapture = (event: DragEvent) => {
		const dragging = getDragging();
		if (!dragging) return;
		event.preventDefault();
		handleDragHoverFromPointer(
			dragging,
			event.clientX,
			event.clientY,
			getDateKeyFromPointer,
			setDragHoverDateKey,
		);
	};

	const handleDragEnterCapture = (event: DragEvent) => {
		const dragging = getDragging();
		if (!dragging) return;
		event.preventDefault();
		handleDragHoverFromPointer(
			dragging,
			event.clientX,
			event.clientY,
			getDateKeyFromPointer,
			setDragHoverDateKey,
		);
	};

	const handleDropCapture = (event: DragEvent) => {
		const dragging = getDragging();
		if (!dragging) return;
		event.preventDefault();
		const dateKey = getDateKeyFromPointer(event.clientX, event.clientY);
		if (dateKey) {
			handleDrop(dateKey);
		}
	};

	return { handleDragOverCapture, handleDragEnterCapture, handleDropCapture };
};
