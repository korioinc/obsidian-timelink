import type { EditableEventResponse } from '../calendar';
import { canMoveEvent } from '../event-sync';
import type { EventSegment } from '../types';
import { clampEventDate, diffInDays, parseDateKey } from '../utils/month-calendar-utils';

export const createDragImage = (event: DragEvent, segment: EventSegment) => {
	if (!event.dataTransfer) return;
	event.dataTransfer.effectAllowed = 'move';
	event.dataTransfer.setData('text/plain', segment.id);
	const target = event.currentTarget as HTMLElement | null;
	if (!target || !target.getBoundingClientRect) return;
	const rect = target.getBoundingClientRect();
	const clone = target.cloneNode(true) as HTMLElement;
	clone.classList.add('timelink-drag-preview');
	clone.setCssProps({
		position: 'fixed',
		top: '-9999px',
		left: '-9999px',
		'pointer-events': 'none',
		opacity: '0.9',
	});
	document.body.appendChild(clone);
	const offsetX = event.clientX - rect.left;
	const offsetY = event.clientY - rect.top;
	event.dataTransfer.setDragImage(clone, offsetX, offsetY);
	window.setTimeout(() => clone.remove(), 0);
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
		onMoveEvent(updated, original);
		setDragging(null);
		setDragHoverDateKey(null);
	};
};

export const handleDragHoverFromPointer = (
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
