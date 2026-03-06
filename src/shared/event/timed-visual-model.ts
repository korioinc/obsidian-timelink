import { normalizeDateRangeKeys } from '../time-grid/overlay-range';
import { buildSingleColumnSegments } from '../time-grid/overlay-segments';
import { MINUTES_IN_DAY, toMinutes } from './model-utils';
import type { EventSegment, TimeSelectionRange, TimedEventPlacement } from './types';

const clampMinutes = (value: number) => Math.min(MINUTES_IN_DAY, Math.max(0, value));

const isTimedEventDraggable = (segment: EventSegment): boolean => Boolean(segment.event.date);

type DateRangeKeys = ReturnType<typeof normalizeDateRangeKeys>;

const deriveResizeVisualRange = (
	cellDateKey: string,
	eventStartMinutes: number,
	timedResizeRange: TimeSelectionRange,
	resizeRangeKeys: DateRangeKeys,
) => {
	if (resizeRangeKeys.startKey === resizeRangeKeys.endKey) {
		return {
			startMinutes: eventStartMinutes,
			endMinutes: timedResizeRange.endMinutes,
		};
	}
	if (cellDateKey === resizeRangeKeys.startKey) {
		return {
			startMinutes: eventStartMinutes,
			endMinutes: MINUTES_IN_DAY,
		};
	}
	if (cellDateKey === resizeRangeKeys.endKey) {
		return {
			startMinutes: 0,
			endMinutes: timedResizeRange.endMinutes,
		};
	}
	return {
		startMinutes: 0,
		endMinutes: MINUTES_IN_DAY,
	};
};

export const deriveTimedEventVisualState = ({
	cellDateKey,
	eventStartMinutes,
	eventEndMinutes,
	placementStartMinutes,
	placementEndMinutes,
	slotMinutes,
	slotHeight,
	isDraggingEvent,
	isResizingEvent,
	timedDragStartMinutes,
	timedDragEndMinutes,
	timedResizeRange,
	resizeRangeKeys,
}: {
	cellDateKey: string;
	eventStartMinutes: number;
	eventEndMinutes: number;
	placementStartMinutes: number;
	placementEndMinutes: number;
	slotMinutes: number;
	slotHeight: number;
	isDraggingEvent: boolean;
	isResizingEvent: boolean;
	timedDragStartMinutes: number | null;
	timedDragEndMinutes: number | null;
	timedResizeRange: TimeSelectionRange | null;
	resizeRangeKeys: DateRangeKeys | null;
}) => {
	const labelStartMinutes = timedDragStartMinutes ?? eventStartMinutes;
	const labelEndMinutes =
		timedDragEndMinutes ??
		(isResizingEvent && timedResizeRange && resizeRangeKeys?.endKey === cellDateKey
			? timedResizeRange.endMinutes
			: eventEndMinutes);

	let visualStartMinutes: number | null = null;
	let visualEndMinutes: number | null = null;

	if (isResizingEvent && timedResizeRange && resizeRangeKeys) {
		const range = deriveResizeVisualRange(
			cellDateKey,
			eventStartMinutes,
			timedResizeRange,
			resizeRangeKeys,
		);
		visualStartMinutes = range.startMinutes;
		visualEndMinutes = range.endMinutes;
	} else if (timedDragStartMinutes !== null && timedDragEndMinutes !== null) {
		visualStartMinutes = timedDragStartMinutes;
		visualEndMinutes = timedDragEndMinutes;
	}

	if (visualStartMinutes !== null && visualEndMinutes !== null) {
		const clampedStart = clampMinutes(visualStartMinutes);
		const clampedEnd = clampMinutes(visualEndMinutes);
		visualStartMinutes = Math.min(clampedStart, clampedEnd);
		visualEndMinutes = Math.max(clampedStart, clampedEnd);
	}

	const visualTop =
		visualStartMinutes !== null
			? (visualStartMinutes / slotMinutes) * slotHeight
			: (placementStartMinutes / slotMinutes) * slotHeight;
	const baseHeight =
		visualStartMinutes !== null && visualEndMinutes !== null
			? Math.max(0, (visualEndMinutes - visualStartMinutes) / slotMinutes) * slotHeight
			: Math.max(0, (placementEndMinutes - placementStartMinutes) / slotMinutes) * slotHeight;

	return {
		labelStartMinutes,
		labelEndMinutes,
		visualTop,
		visualHeight: isDraggingEvent ? 40 : baseHeight,
	};
};

type ResolveSingleColumnOverlayStateParams = {
	dateKey: string;
	selectionRange: TimeSelectionRange | null;
	timedResizeRange: TimeSelectionRange | null;
	timedDragRange: TimeSelectionRange | null;
};

type SingleColumnOverlayState = {
	selectionSegments: ReturnType<typeof buildSingleColumnSegments>;
	timedDragSegments: ReturnType<typeof buildSingleColumnSegments>;
	resizeRangeKeys: ReturnType<typeof normalizeDateRangeKeys> | null;
	showTimedDrag: boolean;
};

export const resolveSingleColumnOverlayState = ({
	dateKey,
	selectionRange,
	timedResizeRange,
	timedDragRange,
}: ResolveSingleColumnOverlayStateParams): SingleColumnOverlayState => {
	const selectionSegments = buildSingleColumnSegments(dateKey, selectionRange);
	const timedDragSegments = buildSingleColumnSegments(dateKey, timedDragRange);
	const resizeRangeKeys = timedResizeRange
		? normalizeDateRangeKeys(timedResizeRange.startDateKey, timedResizeRange.endDateKey)
		: null;

	return {
		selectionSegments,
		timedDragSegments,
		resizeRangeKeys,
		showTimedDrag: timedDragSegments.length > 0,
	};
};

type SingleColumnTimedEventRenderModel = {
	segment: EventSegment;
	draggable: boolean;
	eventColor: string;
	isDraggingEvent: boolean;
	visualTop: number;
	visualHeight: number;
	left: number;
	width: number;
	startLabel: string;
	endLabel: string;
};

export type SingleColumnTimedEventRenderEntry = {
	placement: TimedEventPlacement;
	model: SingleColumnTimedEventRenderModel;
};

type SingleColumnTimedRenderSharedParams = {
	dateKey: string;
	slotMinutes: number;
	slotHeight: number;
	timedResizingId?: string | null;
	timedDraggingId?: string | null;
	timedResizeRange: TimeSelectionRange | null;
	timedDragRange: TimeSelectionRange | null;
	showTimedDrag: boolean;
	defaultEventColor: string;
	normalizeEventColor: (color?: string | null) => string | null;
	formatTime: (minutes: number) => string;
};

type BuildSingleColumnTimedEventRenderModelParams = SingleColumnTimedRenderSharedParams & {
	placement: TimedEventPlacement;
};

export const buildSingleColumnTimedEventRenderModel = ({
	placement,
	dateKey,
	slotMinutes,
	slotHeight,
	timedResizingId,
	timedDraggingId,
	timedResizeRange,
	timedDragRange,
	showTimedDrag,
	defaultEventColor,
	normalizeEventColor,
	formatTime,
}: BuildSingleColumnTimedEventRenderModelParams): SingleColumnTimedEventRenderModel => {
	const isResizingEvent = timedResizingId === placement.segment.id && Boolean(timedResizeRange);
	const isDraggingEvent = timedDraggingId === placement.segment.id;
	const hasDragRange = isDraggingEvent && showTimedDrag && Boolean(timedDragRange);
	const draggable = isTimedEventDraggable(placement.segment);
	const eventColor = normalizeEventColor(placement.segment.event.color) ?? defaultEventColor;
	const eventStartMinutes = toMinutes(placement.segment.event.startTime) ?? placement.startMinutes;
	const eventEndMinutes = toMinutes(placement.segment.event.endTime) ?? placement.endMinutes;
	const dragStartMinutes = hasDragRange && timedDragRange ? timedDragRange.startMinutes : null;
	const dragEndMinutes =
		hasDragRange && timedDragRange
			? timedDragRange.endDateKey === dateKey
				? timedDragRange.endMinutes
				: MINUTES_IN_DAY
			: null;
	const visualState = deriveTimedEventVisualState({
		cellDateKey: dateKey,
		eventStartMinutes,
		eventEndMinutes,
		placementStartMinutes: placement.startMinutes,
		placementEndMinutes: placement.endMinutes,
		slotMinutes,
		slotHeight,
		isDraggingEvent,
		isResizingEvent,
		timedDragStartMinutes: dragStartMinutes,
		timedDragEndMinutes: dragEndMinutes,
		timedResizeRange,
		resizeRangeKeys: timedResizeRange
			? normalizeDateRangeKeys(timedResizeRange.startDateKey, timedResizeRange.endDateKey)
			: null,
	});
	const startLabel = formatTime(visualState.labelStartMinutes);
	const endLabel = formatTime(visualState.labelEndMinutes);
	const width = 100 / Math.max(1, placement.columnCount);
	const left = width * placement.column;

	return {
		segment: placement.segment,
		draggable,
		eventColor,
		isDraggingEvent,
		visualTop: visualState.visualTop,
		visualHeight: visualState.visualHeight,
		left,
		width,
		startLabel,
		endLabel,
	};
};

type BuildSingleColumnTimedEventRenderEntriesParams = SingleColumnTimedRenderSharedParams & {
	timedEvents: TimedEventPlacement[];
};

export const buildSingleColumnTimedEventRenderEntries = ({
	timedEvents,
	dateKey,
	slotMinutes,
	slotHeight,
	timedResizingId,
	timedDraggingId,
	timedResizeRange,
	timedDragRange,
	showTimedDrag,
	defaultEventColor,
	normalizeEventColor,
	formatTime,
}: BuildSingleColumnTimedEventRenderEntriesParams): SingleColumnTimedEventRenderEntry[] =>
	timedEvents.map((placement) => ({
		placement,
		model: buildSingleColumnTimedEventRenderModel({
			placement,
			dateKey,
			slotMinutes,
			slotHeight,
			timedResizingId,
			timedDraggingId,
			timedResizeRange,
			timedDragRange,
			showTimedDrag,
			defaultEventColor,
			normalizeEventColor,
			formatTime,
		}),
	}));
