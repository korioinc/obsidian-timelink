import { canMoveEvent } from '../../../shared/event/event-sync';
import {
	DEFAULT_EVENT_COLOR,
	addDays,
	clampEventDate,
	diffInDays,
	formatDateKey,
	normalizeEventColor,
	parseDateKey,
	resolveEffectiveTimedEventRange,
} from '../../../shared/event/model-utils';
import type { EditableEventResponse } from '../../../shared/event/types';
import type { EventSegment } from '../../types';

const DRAG_PREVIEW_OFFSET_X = 12;
const DRAG_PREVIEW_OFFSET_Y = 12;
const UNTITLED_DRAG_PREVIEW_LABEL = 'Untitled event';

type DragAnchorOffsetDaysRef = { current: number };

const shiftDateKey = (dateKey: string, days: number): string =>
	formatDateKey(addDays(parseDateKey(dateKey), days));

const resolveAnchoredDateKey = (pointerDateKey: string, anchorOffsetDays: number): string =>
	anchorOffsetDays === 0 ? pointerDateKey : shiftDateKey(pointerDateKey, -anchorOffsetDays);

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

const resolveDraggableSegmentRange = (segment: EventSegment) => {
	const baseDate = segment.event.date ?? segment.event.startDate ?? segment.start;
	const effectiveRange = resolveEffectiveTimedEventRange({
		...segment.event,
		date: baseDate,
	});
	if (effectiveRange) {
		return {
			start: effectiveRange.startKey,
			end: effectiveRange.endKey,
			endDate:
				effectiveRange.endKey === effectiveRange.startKey ? undefined : effectiveRange.endKey,
		};
	}
	const baseEndDate = segment.event.endDate ?? null;
	const resolvedEnd = baseEndDate ?? (segment.span > 1 ? segment.end : baseDate);
	return {
		start: baseDate,
		end: resolvedEnd,
		endDate: baseEndDate ?? (resolvedEnd !== baseDate ? resolvedEnd : undefined),
	};
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
	dragAnchorOffsetDaysRef: DragAnchorOffsetDaysRef = { current: 0 },
) => {
	return (event: DragEvent, segment: EventSegment) => {
		const range = resolveDraggableSegmentRange(segment);
		setDragging({
			...segment,
			start: range.start,
			end: range.end,
			event: {
				...segment.event,
				date: range.start,
				endDate: range.endDate,
			},
		});
		const pointerDateKey = getDateKeyFromPointer(event.clientX, event.clientY);
		const anchorDateKey = pointerDateKey ?? range.start;
		dragAnchorOffsetDaysRef.current = diffInDays(
			parseDateKey(range.start),
			parseDateKey(anchorDateKey),
		);
		setDragHoverDateKey(resolveAnchoredDateKey(anchorDateKey, dragAnchorOffsetDaysRef.current));
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
	dragAnchorOffsetDaysRef: DragAnchorOffsetDaysRef = { current: 0 },
) => {
	return (event: DragEvent, segment: EventSegment, sourceDateKey?: string) => {
		const { event: calendarEvent, location } = segment;
		const range = resolveDraggableSegmentRange(segment);
		setDragging({
			...segment,
			start: range.start,
			end: range.end,
			event: {
				...calendarEvent,
				date: range.start,
				endDate: range.endDate,
			},
			location,
		});
		const anchorDateKey = sourceDateKey ?? range.start;
		dragAnchorOffsetDaysRef.current = diffInDays(
			parseDateKey(range.start),
			parseDateKey(anchorDateKey),
		);
		setDragHoverDateKey(resolveAnchoredDateKey(anchorDateKey, dragAnchorOffsetDaysRef.current));
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
	dragAnchorOffsetDays: number,
) => {
	if (!dragging) return;
	const dateKey = getDateKeyFromPointer(clientX, clientY);
	if (dateKey) {
		setDragHoverDateKey(resolveAnchoredDateKey(dateKey, dragAnchorOffsetDays));
	}
};

export const createDragCaptureHandlers = (
	getDragging: () => EventSegment | null,
	getDateKeyFromPointer: (x: number, y: number) => string | null,
	setDragHoverDateKey: (dateKey: string) => void,
	handleDrop: (dateKey: string) => void,
	dragAnchorOffsetDaysRef: DragAnchorOffsetDaysRef = { current: 0 },
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
			dragAnchorOffsetDaysRef.current,
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
			dragAnchorOffsetDaysRef.current,
		);
	};

	const handleDropCapture = (event: DragEvent) => {
		const dragging = getDragging();
		if (!dragging) return;
		event.preventDefault();
		const dateKey = getDateKeyFromPointer(event.clientX, event.clientY);
		if (dateKey) {
			handleDrop(resolveAnchoredDateKey(dateKey, dragAnchorOffsetDaysRef.current));
		}
	};

	return { handleDragOverCapture, handleDragEnterCapture, handleDropCapture };
};
