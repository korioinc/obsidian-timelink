import { getShiftedDateRange } from '../../../shared/event/date-range';
import { compareDateKey } from '../../../shared/event/model-utils';
import type { EventSegment } from '../../types';

const deriveDragRange = (dragging: EventSegment | null, dragHoverDateKey: string | null) => {
	if (!dragging || !dragHoverDateKey) return null;
	const baseStart = dragging.event.date ?? dragging.start;
	const baseEnd = dragging.event.endDate ?? dragging.event.date ?? dragging.end;
	return getShiftedDateRange(baseStart, baseEnd, dragHoverDateKey);
};

const deriveResizeRange = (resizing: EventSegment | null, resizeHoverDateKey: string | null) => {
	if (!resizing || !resizeHoverDateKey) return null;
	const baseStart = resizing.event.date ?? resizing.start;
	let end = resizeHoverDateKey;
	if (compareDateKey(end, baseStart) < 0) {
		end = baseStart;
	}
	return { start: baseStart, end };
};

const computeDragHoverIndex = (
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
