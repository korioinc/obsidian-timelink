import type {
	CalendarEvent,
	EventSegment,
	WeekDayKey,
	WeekEventLayout,
	WeekMultiDayPlacement,
	WeekSingleDayPlacement,
} from '../types';
import type { DayCellData } from './date-grid';

export type LayoutEventSegment = Omit<EventSegment, 'id' | 'location'>;
export type EventRows = LayoutEventSegment[][];

export type SelectionRange = { startIndex: number; endIndex: number };
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

const parseTimeMinutes = (value?: string): number | null => {
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
		segment: LayoutEventSegment;
		clampedStart: number;
		clampedEnd: number;
	},
	b: {
		stackRow: number;
		segment: LayoutEventSegment;
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
	const aTime = parseTimeMinutes(a.segment.event.startTime);
	const bTime = parseTimeMinutes(b.segment.event.startTime);
	if (aTime !== null || bTime !== null) {
		if (aTime === null) return 1;
		if (bTime === null) return -1;
		if (aTime !== bTime) return aTime - bTime;
	}
	const aTitle = (a.segment.event.title ?? '').toLowerCase();
	const bTitle = (b.segment.event.title ?? '').toLowerCase();
	return aTitle.localeCompare(bTitle);
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
	segment: LayoutEventSegment;
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
			segment: item.segment as EventSegment,
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

const parseDate = (date: string): Date => {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

const formatDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const diffInDays = (start: Date, end: Date): number => {
	const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
	const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
	return Math.floor((endUtc - startUtc) / 86400000);
};

const addDays = (date: Date, days: number): Date => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};

const indexByDate = (grid: DayCellData[]): Map<string, number> => {
	const map = new Map<string, number>();
	grid.forEach((cell, index) => {
		map.set(formatDate(cell.date), index);
	});
	return map;
};

export const getShiftedDateRange = (
	start: string,
	end: string,
	targetStart: string,
): { start: string; end: string } => {
	const startDate = parseDate(start);
	const endDate = parseDate(end);
	const targetDate = parseDate(targetStart);
	const offset = diffInDays(startDate, targetDate);
	return {
		start: formatDate(addDays(startDate, offset)),
		end: formatDate(addDays(endDate, offset)),
	};
};

export const splitMultiDay = (
	event: CalendarEvent,
): Array<{
	event: CalendarEvent;
	start: string;
	end: string;
	span: number;
}> => {
	if (!event.date) {
		return [];
	}
	const start = event.date;
	let end = event.endDate ?? event.date;
	const startDate = parseDate(start);
	let endDate = parseDate(end);
	if (endDate < startDate) {
		end = start;
		endDate = startDate;
	}
	const span = diffInDays(startDate, endDate) + 1;
	return [{ event, start, end, span }];
};

export const buildEventRows = (events: CalendarEvent[], grid: DayCellData[]): EventRows => {
	const dateToIndex = indexByDate(grid);
	const gridStart = grid[0] ? formatDate(grid[0].date) : '';
	const lastCell = grid[grid.length - 1];
	const gridEnd = lastCell ? formatDate(lastCell.date) : '';
	const segments: LayoutEventSegment[] = [];
	for (const event of events) {
		if (!event.date) {
			continue;
		}
		for (const part of splitMultiDay(event)) {
			const startDate = parseDate(part.start);
			const endDate = parseDate(part.end);
			if (!gridStart || !gridEnd) {
				continue;
			}
			const gridStartDate = parseDate(gridStart);
			const gridEndDate = parseDate(gridEnd);
			if (endDate < gridStartDate || startDate > gridEndDate) {
				continue;
			}
			const clampedStartDate = startDate < gridStartDate ? gridStartDate : startDate;
			const clampedEndDate = endDate > gridEndDate ? gridEndDate : endDate;
			const clampedStart = formatDate(clampedStartDate);
			const clampedEnd = formatDate(clampedEndDate);
			const startIndex = dateToIndex.get(clampedStart) ?? -1;
			const endIndex = dateToIndex.get(clampedEnd) ?? -1;
			if (startIndex === -1 || endIndex === -1) {
				continue;
			}
			segments.push({
				event,
				start: clampedStart,
				end: clampedEnd,
				span: diffInDays(clampedStartDate, clampedEndDate) + 1,
				startIndex,
				endIndex,
			});
		}
	}
	segments.sort((a, b) => {
		if (a.startIndex !== b.startIndex) {
			return a.startIndex - b.startIndex;
		}
		if (a.span !== b.span) {
			return b.span - a.span;
		}
		if (a.span === 1 && b.span === 1) {
			const aTime = parseTimeMinutes(a.event.startTime);
			const bTime = parseTimeMinutes(b.event.startTime);
			if (aTime !== null || bTime !== null) {
				if (aTime === null) return 1;
				if (bTime === null) return -1;
				if (aTime !== bTime) return aTime - bTime;
			}
			const aTitle = (a.event.title ?? '').toLowerCase();
			const bTitle = (b.event.title ?? '').toLowerCase();
			if (aTitle !== bTitle) {
				return aTitle.localeCompare(bTitle);
			}
		}
		return 0;
	});
	const rows: EventRows = [];
	for (const segment of segments) {
		let placed = false;
		for (const row of rows) {
			const collision = row.some((existing) => {
				if (segment.startIndex === -1 || existing.startIndex === -1) {
					return true;
				}
				return !(segment.endIndex < existing.startIndex || segment.startIndex > existing.endIndex);
			});
			if (!collision) {
				row.push(segment);
				placed = true;
				break;
			}
		}
		if (!placed) {
			rows.push([segment]);
		}
	}
	return rows;
};
