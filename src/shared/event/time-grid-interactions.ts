import {
	addDays,
	clampEventDate,
	compareDateKey,
	diffInDays,
	formatDateKey,
	formatTime,
	normalizeRange,
	parseDateKey,
	toMinutes,
} from './model-utils';
import { getShiftedTimedRange } from './shifted-timed-range';
import type {
	CalendarEvent,
	EventSegment,
	TimeSelectionRange,
	TimeSelectionState,
	TimedDragAnchor,
} from './types';

export type DateKeyGridCell = { key: string };

export type GridRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

const clampIndex = (value: number, max: number) => {
	if (Number.isNaN(value)) return 0;
	return Math.min(Math.max(0, value), max);
};

export const getDateKeyFromPoint = (
	clientX: number,
	clientY: number,
	rect: GridRect,
	gridByIndex: DateKeyGridCell[],
): string | null => {
	if (!rect.width || !rect.height) return null;
	const colWidth = rect.width / 7;
	const rowHeight = rect.height / 6;
	const rawCol = Math.floor((clientX - rect.left) / colWidth);
	const rawRow = Math.floor((clientY - rect.top) / rowHeight);
	const col = clampIndex(rawCol, 6);
	const row = clampIndex(rawRow, 5);
	const index = row * 7 + col;
	return gridByIndex[index]?.key ?? null;
};

const MINUTES_IN_DAY = 24 * 60;
const DEFAULT_STEP_MINUTES = 30;

export const getMinutesFromY = (
	clientY: number,
	gridTop: number,
	slotHeight: number,
	step = DEFAULT_STEP_MINUTES,
) => {
	const relative = Math.max(0, clientY - gridTop);
	const raw = Math.floor(relative / slotHeight) * step;
	return Math.min(MINUTES_IN_DAY, Math.max(0, raw));
};

export const snapMinutes = (minutes: number, step: number) => {
	const snapped = Math.floor(minutes / step) * step;
	return Math.max(0, Math.min(MINUTES_IN_DAY, snapped));
};

export const getMinutesFromPointer = (
	clientY: number,
	gridRect: DOMRect,
	slotHeight: number,
	step = DEFAULT_STEP_MINUTES,
) => {
	const relative = Math.max(0, clientY - gridRect.top);
	return Math.max(0, Math.min(MINUTES_IN_DAY, (relative / slotHeight) * step));
};

export const resolveSnappedMinutesFromPointer = (
	clientY: number,
	gridRect: DOMRect,
	slotHeight: number,
	step = DEFAULT_STEP_MINUTES,
) => snapMinutes(getMinutesFromPointer(clientY, gridRect, slotHeight, step), step);

export const resolveSnappedMinutesFromY = (
	clientY: number,
	gridTop: number,
	slotHeight: number,
	step = DEFAULT_STEP_MINUTES,
) => snapMinutes(getMinutesFromY(clientY, gridTop, slotHeight, step), step);

export const getDateKeyFromPointer = (clientX: number, gridRect: DOMRect, dateKeys: string[]) => {
	if (!gridRect.width) return null;
	const columnCount = Math.max(1, dateKeys.length);
	const columnWidth = gridRect.width / columnCount;
	const rawColumn = Math.floor((clientX - gridRect.left) / columnWidth);
	const column = Math.min(columnCount - 1, Math.max(0, rawColumn));
	return dateKeys[column] ?? null;
};

export const normalizeEndDate = (startKey: string, endKey: string) => {
	if (compareDateKey(endKey, startKey) < 0) return startKey;
	return endKey;
};

const shiftDateKey = (dateKey: string, days: number): string => {
	if (days === 0) return dateKey;
	return formatDateKey(addDays(parseDateKey(dateKey), days));
};

const normalizeBoundaryDateAndMinutes = (dateKey: string, minutes: number) => {
	const dayOffset = Math.floor(minutes / MINUTES_IN_DAY);
	const normalizedMinutes = minutes - dayOffset * MINUTES_IN_DAY;
	return {
		dateKey: shiftDateKey(dateKey, dayOffset),
		minutes: normalizedMinutes,
	};
};

const resolveTimedEventStartBoundary = (segment: EventSegment) => ({
	dateKey: segment.event.date ?? segment.start,
	minutes: toMinutes(segment.event.startTime) ?? 0,
});

const getTimedDragAnchorOffsetMinutes = (
	segment: EventSegment,
	dragAnchor: TimedDragAnchor,
): number => {
	const actualStart = resolveTimedEventStartBoundary(segment);
	return (
		diffInDays(parseDateKey(actualStart.dateKey), parseDateKey(dragAnchor.dateKey)) *
			MINUTES_IN_DAY +
		(dragAnchor.startMinutes - actualStart.minutes)
	);
};

export const normalizeTimeSelection = (
	state: TimeSelectionState,
	step = DEFAULT_STEP_MINUTES,
): TimeSelectionRange | null => {
	if (!state.anchorDateKey || state.anchorMinutes === null) return null;
	if (!state.hoverDateKey || state.hoverMinutes === null) return null;
	const isForward = compareDateKey(state.anchorDateKey, state.hoverDateKey) <= 0;
	const { start, end } = normalizeRange(state.anchorDateKey, state.hoverDateKey);
	const anchorMinutes = state.anchorMinutes;
	const hoverMinutes = state.hoverMinutes;
	const rawStartMinutes = isForward ? anchorMinutes : hoverMinutes;
	const maxStartMinutes = Math.max(0, MINUTES_IN_DAY - step);
	const startMinutes = Math.min(maxStartMinutes, Math.max(0, rawStartMinutes));
	const rawEndMinutes = isForward ? hoverMinutes : anchorMinutes;
	const endMinutes = Math.min(MINUTES_IN_DAY, Math.max(startMinutes + step, rawEndMinutes));
	return {
		startDateKey: start,
		endDateKey: end,
		startMinutes,
		endMinutes,
	};
};

type GridRectLike = {
	left: number;
	top: number;
	width: number;
	height: number;
};

type PointerStateParams = {
	clientX: number;
	clientY: number;
	rect: GridRectLike;
	dateKeys: string[];
	slotHeight: number;
	slotMinutes: number;
};

export const deriveTimedPointerState = ({
	clientX,
	clientY,
	rect,
	dateKeys,
	slotHeight,
	slotMinutes,
}: PointerStateParams) => {
	const dateKey = getDateKeyFromPointer(clientX, rect as DOMRect, dateKeys);
	if (!dateKey) return null;
	const minutes = snapMinutes(
		getMinutesFromPointer(clientY, rect as DOMRect, slotHeight, slotMinutes),
		slotMinutes,
	);
	return { dateKey, minutes };
};

type SelectionPointerStateParams = {
	clientX: number;
	clientY: number;
	rect: GridRectLike;
	dateKeys: string[];
	slotHeight: number;
};

export const deriveTimeSelectionPointerState = ({
	clientX,
	clientY,
	rect,
	dateKeys,
	slotHeight,
}: SelectionPointerStateParams) => {
	const dateKey = getDateKeyFromPointer(clientX, rect as DOMRect, dateKeys);
	if (!dateKey) return null;
	const minutes = getMinutesFromY(clientY, rect.top, slotHeight);
	return { dateKey, minutes };
};

export const deriveTimedResizeRange = (
	timedResizing: EventSegment | null,
	timedResizeHoverDateKey: string | null,
	timedResizeHoverMinutes: number | null,
): TimeSelectionRange | null => {
	if (!timedResizing) return null;
	const startKey = timedResizing.event.date ?? timedResizing.start;
	const endKey = normalizeEndDate(startKey, timedResizeHoverDateKey ?? startKey);
	const startMinutes = toMinutes(timedResizing.event.startTime) ?? 0;
	const endMinutes = timedResizeHoverMinutes ?? toMinutes(timedResizing.event.endTime) ?? 0;
	return {
		startDateKey: startKey,
		endDateKey: endKey,
		startMinutes,
		endMinutes,
	};
};

export const buildTimedResizeEvent = (
	timedResizing: EventSegment,
	timedResizeHoverDateKey: string | null,
	timedResizeHoverMinutes: number | null,
): CalendarEvent => {
	const startKey = timedResizing.event.date ?? timedResizing.start;
	const endKey = normalizeEndDate(startKey, timedResizeHoverDateKey ?? startKey);
	const startMinutes = toMinutes(timedResizing.event.startTime) ?? 0;
	const endMinutes = timedResizeHoverMinutes ?? toMinutes(timedResizing.event.endTime) ?? 0;
	const normalizedEndMinutes =
		endKey === startKey ? Math.max(startMinutes, endMinutes) : endMinutes;
	const normalizedEnd = normalizeBoundaryDateAndMinutes(endKey, normalizedEndMinutes);
	return {
		...timedResizing.event,
		endDate: normalizedEnd.dateKey === startKey ? undefined : normalizedEnd.dateKey,
		endTime: formatTime(normalizedEnd.minutes),
		startTime: timedResizing.event.startTime ?? formatTime(startMinutes),
	};
};

export const deriveTimedDragRange = (
	timedDragging: EventSegment | null,
	timedDragHoverDateKey: string | null,
	timedDragHoverMinutes: number | null,
): TimeSelectionRange | null => {
	if (!timedDragging) return null;
	const baseStartKey = timedDragging.event.date ?? timedDragging.start;
	const baseEndKey = timedDragging.event.endDate ?? timedDragging.end ?? baseStartKey;
	const baseStartMinutes = toMinutes(timedDragging.event.startTime) ?? 0;
	const baseEndMinutes = toMinutes(timedDragging.event.endTime) ?? 0;
	const hoverKey = timedDragHoverDateKey ?? baseStartKey;
	const hoverMinutes = timedDragHoverMinutes ?? baseStartMinutes;
	const { startMinutes, endMinutes, endDateKey } = getShiftedTimedRange({
		baseStartKey,
		baseEndKey,
		hoverKey,
		baseStartMinutes,
		baseEndMinutes,
		hoverMinutes,
	});
	return {
		startDateKey: hoverKey,
		endDateKey: endDateKey === hoverKey ? hoverKey : endDateKey,
		startMinutes,
		endMinutes,
	};
};

export const resolveTimedDragHoverState = (
	timedDragging: EventSegment,
	hoverDateKey: string,
	hoverMinutes: number,
	dragAnchor?: TimedDragAnchor | null,
) => {
	if (!dragAnchor) {
		return {
			dateKey: hoverDateKey,
			minutes: hoverMinutes,
		};
	}

	const anchorOffsetMinutes = getTimedDragAnchorOffsetMinutes(timedDragging, dragAnchor);
	return normalizeBoundaryDateAndMinutes(hoverDateKey, hoverMinutes - anchorOffsetMinutes);
};

export const buildTimedDragDropEvent = (
	timedDragging: EventSegment,
	hoverKey: string,
	hoverMinutes: number,
): CalendarEvent => {
	const baseDate = timedDragging.event.date ?? timedDragging.start;
	const baseEndKey = timedDragging.event.endDate ?? timedDragging.end ?? baseDate;
	const baseStartMinutes = toMinutes(timedDragging.event.startTime) ?? 0;
	const baseEndMinutes = toMinutes(timedDragging.event.endTime) ?? 0;
	const offsetDays = diffInDays(parseDateKey(baseDate), parseDateKey(hoverKey));
	const { startMinutes, endMinutes, endDateKey } = getShiftedTimedRange({
		baseStartKey: baseDate,
		baseEndKey,
		hoverKey,
		baseStartMinutes,
		baseEndMinutes,
		hoverMinutes,
	});
	const normalizedStart = normalizeBoundaryDateAndMinutes(hoverKey, startMinutes);
	const normalizedEnd = normalizeBoundaryDateAndMinutes(endDateKey, endMinutes);
	const nextEvent = clampEventDate(timedDragging.event, offsetDays);
	return {
		...nextEvent,
		allDay: false,
		date: normalizedStart.dateKey,
		endDate: normalizedEnd.dateKey,
		startTime: formatTime(normalizedStart.minutes),
		endTime: formatTime(normalizedEnd.minutes),
	};
};
