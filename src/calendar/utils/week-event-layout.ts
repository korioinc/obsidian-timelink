import type {
	EventSegment,
	WeekDayKey,
	WeekEventLayout,
	WeekMultiDayPlacement,
	WeekSingleDayPlacement,
} from '../types';
import { compareEventTimeMinutesThenTitle } from './event-order';

type SelectionRange = { startIndex: number; endIndex: number };
export type SelectionSpan = { columnStart: number; span: number };

const EMPTY_HIDDEN_COUNTS: Record<WeekDayKey, number> = {
	0: 0,
	1: 0,
	2: 0,
	3: 0,
	4: 0,
	5: 0,
	6: 0,
};

const parseTimeMinutes = (value?: string | null): number | null => {
	if (!value) return null;
	const parts = value.split(':');
	if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined) return null;
	const hours = Number(parts[0]);
	const minutes = Number(parts[1]);
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
	return hours * 60 + minutes;
};

export const getWeekBounds = (weekIndex: number) => {
	const weekStartIndex = weekIndex * 7;
	const weekEndIndex = weekStartIndex + 6;
	return { weekStartIndex, weekEndIndex };
};

export const getWeekCells = <T>(cells: T[], weekStartIndex: number, weekLength = 7): T[] =>
	cells.slice(weekStartIndex, weekStartIndex + weekLength);

export const getSelectionSpanForWeek = (
	selectionRange: SelectionRange | null,
	weekStartIndex: number,
	weekEndIndex: number,
): SelectionSpan | null => {
	if (!selectionRange) return null;
	const clampedStart = Math.max(selectionRange.startIndex, weekStartIndex);
	const clampedEnd = Math.min(selectionRange.endIndex, weekEndIndex);
	if (clampedStart > clampedEnd) return null;
	return {
		columnStart: clampedStart - weekStartIndex + 1,
		span: clampedEnd - clampedStart + 1,
	};
};

export const getRowCapacity = (gridRowCapacity: number) => Math.max(0, gridRowCapacity - 1);

const clampToWeek = (
	startIndex: number,
	endIndex: number,
	weekStartIndex: number,
	weekEndIndex: number,
) => {
	const clampedStart = Math.max(startIndex, weekStartIndex);
	const clampedEnd = Math.min(endIndex, weekEndIndex);
	return { clampedStart, clampedEnd };
};

const compareStackItems = (
	a: {
		stackRow: number;
		segment: EventSegment;
		clampedStart: number;
		clampedEnd: number;
	},
	b: {
		stackRow: number;
		segment: EventSegment;
		clampedStart: number;
		clampedEnd: number;
	},
) => {
	if (a.stackRow !== b.stackRow) {
		return a.stackRow - b.stackRow;
	}
	if (a.segment.startIndex !== b.segment.startIndex) {
		return a.segment.startIndex - b.segment.startIndex;
	}
	if (a.segment.span !== b.segment.span) {
		return b.segment.span - a.segment.span;
	}
	return compareEventTimeMinutesThenTitle(
		parseTimeMinutes(a.segment.event.startTime),
		parseTimeMinutes(b.segment.event.startTime),
		a.segment.event.title,
		b.segment.event.title,
	);
};

const createHiddenCounts = () => ({ ...EMPTY_HIDDEN_COUNTS });

const incrementHiddenCountsForSpan = (
	hiddenCountsByDay: Record<WeekDayKey, number>,
	startIndex: number,
	endIndex: number,
	weekStartIndex: number,
	weekEndIndex: number,
) => {
	const { clampedStart, clampedEnd } = clampToWeek(
		startIndex,
		endIndex,
		weekStartIndex,
		weekEndIndex,
	);
	if (clampedStart > clampedEnd) return;
	for (let index = clampedStart; index <= clampedEnd; index += 1) {
		const dayOffset = index - weekStartIndex;
		if (dayOffset < 0 || dayOffset > 6) continue;
		hiddenCountsByDay[dayOffset as WeekDayKey] += 1;
	}
};

type WeekLayoutItem = {
	segment: EventSegment;
	clampedStart: number;
	clampedEnd: number;
	columnStart: number;
	spanInWeek: number;
	isSpanStart: boolean;
	isSpanEnd: boolean;
	isActualEnd: boolean;
};

const compareWeekLayoutItems = (a: WeekLayoutItem, b: WeekLayoutItem) =>
	compareStackItems(
		{
			stackRow: 0,
			segment: a.segment,
			clampedStart: a.clampedStart,
			clampedEnd: a.clampedEnd,
		},
		{
			stackRow: 0,
			segment: b.segment,
			clampedStart: b.clampedStart,
			clampedEnd: b.clampedEnd,
		},
	);

const willCollide = (
	row: Array<{ start: number; end: number }> | undefined,
	start: number,
	end: number,
) => (row ? row.some((range) => !(end < range.start || start > range.end)) : false);

export const getWeekEventLayout = (
	eventRows: EventSegment[][],
	weekStartIndex: number,
	weekEndIndex: number,
	rowCapacity: number,
): WeekEventLayout => {
	if (rowCapacity <= 0) {
		return {
			rowCapacity,
			weekRowCount: 0,
			multiDayPlacements: [],
			singleDayPlacements: [],
			hiddenCountsByDay: createHiddenCounts(),
		};
	}
	const hiddenCountsByDay = createHiddenCounts();
	const items: WeekLayoutItem[] = [];

	for (const row of eventRows) {
		for (const segment of row) {
			if (segment.endIndex < weekStartIndex || segment.startIndex > weekEndIndex) continue;
			const { clampedStart, clampedEnd } = clampToWeek(
				segment.startIndex,
				segment.endIndex,
				weekStartIndex,
				weekEndIndex,
			);
			if (clampedStart > clampedEnd) continue;
			const columnStart = clampedStart - weekStartIndex + 1;
			const spanInWeek = clampedEnd - clampedStart + 1;
			const isActualStart = segment.startIndex === clampedStart;
			const isActualEnd = segment.endIndex === clampedEnd;
			items.push({
				segment,
				clampedStart,
				clampedEnd,
				columnStart,
				spanInWeek,
				isSpanStart: isActualStart,
				isSpanEnd: isActualEnd,
				isActualEnd,
			});
		}
	}

	items.sort(compareWeekLayoutItems);

	const occupancy: Array<Array<{ start: number; end: number }>> = [];
	let maxRowIndexUsed = -1;
	const placements: Array<
		(WeekMultiDayPlacement | WeekSingleDayPlacement) & { spanType: 'multi' | 'single' }
	> = [];

	const findRowForItem = (start: number, end: number) => {
		for (let rowIndex = 0; rowIndex < occupancy.length; rowIndex += 1) {
			if (!willCollide(occupancy[rowIndex], start, end)) {
				return rowIndex;
			}
		}
		return occupancy.length;
	};

	for (const item of items) {
		const rowIndex = findRowForItem(item.clampedStart, item.clampedEnd);
		if (rowIndex > maxRowIndexUsed) {
			maxRowIndexUsed = rowIndex;
		}
		if (!occupancy[rowIndex]) {
			occupancy[rowIndex] = [];
		}
		occupancy[rowIndex]?.push({ start: item.clampedStart, end: item.clampedEnd });
		if (rowIndex >= rowCapacity) {
			incrementHiddenCountsForSpan(
				hiddenCountsByDay,
				item.segment.startIndex,
				item.segment.endIndex,
				weekStartIndex,
				weekEndIndex,
			);
			continue;
		}
		const basePlacement = {
			segment: item.segment,
			weekRow: rowIndex,
			columnStart: item.columnStart,
			spanInWeek: item.spanInWeek,
			isSpanStart: item.isSpanStart,
			isSpanEnd: item.isSpanEnd,
			isActualEnd: item.isActualEnd,
		};
		if (item.segment.span <= 1) {
			placements.push({
				...basePlacement,
				cellIndex: item.clampedStart,
				dayOffset: (item.clampedStart - weekStartIndex) as WeekDayKey,
				spanType: 'single',
			});
			continue;
		}
		placements.push({
			...basePlacement,
			spanType: 'multi',
		});
	}

	const multiDayPlacements: WeekMultiDayPlacement[] = placements.filter(
		(placement): placement is WeekMultiDayPlacement & { spanType: 'multi' } =>
			placement.spanType === 'multi',
	);
	const singleDayPlacements: WeekSingleDayPlacement[] = placements.filter(
		(placement): placement is WeekSingleDayPlacement & { spanType: 'single' } =>
			placement.spanType === 'single',
	);
	const weekRowCount = Math.max(occupancy.length, maxRowIndexUsed + 1);

	return {
		rowCapacity,
		weekRowCount,
		multiDayPlacements,
		singleDayPlacements,
		hiddenCountsByDay,
	};
};
