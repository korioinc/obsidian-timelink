import type { EditableEventResponse } from '../calendar';
import type { EventSegment } from '../types';
import type { DayCellData } from '../utils/date-grid';
import { buildEventRows, getShiftedDateRange } from '../utils/event-layout';
import { buildEventId, compareDateKey, formatDateKey } from '../utils/month-calendar-utils';

export const deriveGridByIndex = (grid: DayCellData[]) =>
	grid.map((cell) => ({
		date: cell.date,
		key: formatDateKey(cell.date),
		inMonth: cell.inMonth,
	}));

export const deriveIndexByDateKey = (gridByIndex: Array<{ key: string }>) =>
	new Map(gridByIndex.map((cell, index) => [cell.key, index]));

export const buildEventRowsWithLocations = (
	events: EditableEventResponse[],
	grid: DayCellData[],
) => {
	const entries = events.map(([event, location], index) => {
		const id = buildEventId(event, index);
		return {
			id,
			event: { ...event, id },
			location,
		};
	});
	const locationById = new Map(entries.map((entry) => [entry.id, entry.location]));
	return buildEventRows(
		entries.map((entry) => entry.event),
		grid,
	).map((row) =>
		row.map((segment) => ({
			id: segment.event.id ?? '',
			event: segment.event,
			location: locationById.get(segment.event.id ?? '') ?? {
				file: { path: '' },
				lineNumber: undefined,
			},
			start: segment.start,
			end: segment.end,
			span: segment.span,
			startIndex: segment.startIndex,
			endIndex: segment.endIndex,
		})),
	);
};

export const deriveDragRange = (dragging: EventSegment | null, dragHoverDateKey: string | null) => {
	if (!dragging || !dragHoverDateKey) return null;
	const baseStart = dragging.event.date ?? dragging.start;
	const baseEnd = dragging.event.endDate ?? dragging.event.date ?? dragging.end;
	return getShiftedDateRange(baseStart, baseEnd, dragHoverDateKey);
};

export const deriveResizeRange = (
	resizing: EventSegment | null,
	resizeHoverDateKey: string | null,
) => {
	if (!resizing || !resizeHoverDateKey) return null;
	const baseStart = resizing.event.date ?? resizing.start;
	let end = resizeHoverDateKey;
	if (compareDateKey(end, baseStart) < 0) {
		end = baseStart;
	}
	return { start: baseStart, end };
};

export const computeDragHoverIndex = (
	dragHoverDateKey: string | null,
	indexByDateKey: Map<string, number>,
) => {
	if (!dragHoverDateKey) return null;
	const index = indexByDateKey.get(dragHoverDateKey);
	return index === undefined ? null : index;
};

export const deriveDragAndResizeState = (
	dragging: EventSegment | null,
	dragHoverDateKey: string | null,
	resizing: EventSegment | null,
	resizeHoverDateKey: string | null,
	indexByDateKey: Map<string, number>,
) => {
	const dragRange = deriveDragRange(dragging, dragHoverDateKey);
	const resizeRange = deriveResizeRange(resizing, resizeHoverDateKey);
	const dragHoverIndex = computeDragHoverIndex(dragHoverDateKey, indexByDateKey);
	return { dragRange, resizeRange, dragHoverIndex };
};

export const deriveSelectionRange = (
	selection: {
		startDateKey: string | null;
		endDateKey: string | null;
	},
	indexByDateKey: Map<string, number>,
) => {
	if (!selection.startDateKey || !selection.endDateKey) return null;
	const startIndex = indexByDateKey.get(selection.startDateKey);
	const endIndex = indexByDateKey.get(selection.endDateKey);
	if (startIndex === undefined || endIndex === undefined) return null;
	if (startIndex <= endIndex) {
		return { startIndex, endIndex };
	}
	return { startIndex: endIndex, endIndex: startIndex };
};

export const deriveMoreMenuEvents = (
	eventRows: EventSegment[][],
	moreMenu: { dateKey: string } | null,
) => {
	if (!moreMenu) return [];
	const dateKey = moreMenu.dateKey;
	return eventRows
		.flatMap((row) => row.map((segment) => segment))
		.filter((segment) => dateKey >= segment.start && dateKey <= segment.end)
		.map((segment) => ({ segment, location: segment.location }));
};
