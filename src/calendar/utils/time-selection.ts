import type { TimeSelectionRange, TimeSelectionState } from '../types';
import { compareDateKey, normalizeRange } from './month-calendar-utils';

const MINUTES_IN_DAY = 24 * 60;
const SNAP_MINUTES = 30;

export const getMinutesFromY = (clientY: number, gridTop: number, slotHeight: number) => {
	const relative = Math.max(0, clientY - gridTop);
	const raw = Math.floor(relative / slotHeight) * SNAP_MINUTES;
	return Math.min(MINUTES_IN_DAY, Math.max(0, raw));
};

export const snapMinutes = (minutes: number, step: number) => {
	const snapped = Math.floor(minutes / step) * step;
	return Math.max(0, Math.min(MINUTES_IN_DAY, snapped));
};

export const getMinutesFromPointer = (clientY: number, gridRect: DOMRect, slotHeight: number) => {
	const relative = Math.max(0, clientY - gridRect.top);
	return Math.max(0, Math.min(MINUTES_IN_DAY, (relative / slotHeight) * SNAP_MINUTES));
};

export const getDateKeyFromPointer = (clientX: number, gridRect: DOMRect, dateKeys: string[]) => {
	if (!gridRect.width) return null;
	const columnWidth = gridRect.width / 7;
	const rawColumn = Math.floor((clientX - gridRect.left) / columnWidth);
	const column = Math.min(6, Math.max(0, rawColumn));
	return dateKeys[column] ?? null;
};

export const normalizeEndDate = (startKey: string, endKey: string) => {
	if (compareDateKey(endKey, startKey) < 0) return startKey;
	return endKey;
};

export const normalizeTimeSelection = (state: TimeSelectionState): TimeSelectionRange | null => {
	if (!state.anchorDateKey || state.anchorMinutes === null) return null;
	if (!state.hoverDateKey || state.hoverMinutes === null) return null;
	const isForward = compareDateKey(state.anchorDateKey, state.hoverDateKey) <= 0;
	const { start, end } = normalizeRange(state.anchorDateKey, state.hoverDateKey);
	const anchorMinutes = state.anchorMinutes;
	const hoverMinutes = state.hoverMinutes;
	const startMinutes = isForward ? anchorMinutes : hoverMinutes;
	const rawEndMinutes = isForward ? hoverMinutes : anchorMinutes;
	const endMinutes = Math.min(MINUTES_IN_DAY, Math.max(startMinutes + SNAP_MINUTES, rawEndMinutes));
	return {
		startDateKey: start,
		endDateKey: end,
		startMinutes,
		endMinutes,
	};
};
