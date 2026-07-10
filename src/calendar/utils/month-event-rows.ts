import { resolveNormalizedEventDateRange } from '../../shared/event/date-range';
import { diffInDays, formatDateKey, parseDateKey, toMinutes } from '../../shared/event/model-utils';
import { MinHeap } from '../../shared/utils/min-heap';
import type { CalendarEvent, EventSegment } from '../types';
import type { DayCellData } from './date-grid';
import { compareEventTimeMinutesThenTitle } from './event-order';

type LayoutEventSegment = Omit<EventSegment, 'id' | 'location'>;
type EventRows = LayoutEventSegment[][];
type ActiveEventRow = {
	endIndex: number;
	rowIndex: number;
};

const indexByDate = (grid: DayCellData[]): Map<string, number> => {
	const map = new Map<string, number>();
	grid.forEach((cell, index) => {
		map.set(formatDateKey(cell.date), index);
	});
	return map;
};

const toNormalizedSegments = (
	event: CalendarEvent,
): Array<{
	event: CalendarEvent;
	start: string;
	end: string;
	span: number;
}> => {
	const range = resolveNormalizedEventDateRange(event);
	if (!range) {
		return [];
	}
	return [
		{
			event,
			start: range.startKey,
			end: range.endKey,
			span: diffInDays(parseDateKey(range.startKey), parseDateKey(range.endKey)) + 1,
		},
	];
};

export const buildEventRows = (events: CalendarEvent[], grid: DayCellData[]): EventRows => {
	const dateToIndex = indexByDate(grid);
	const firstCell = grid[0];
	const lastCell = grid[grid.length - 1];
	if (!firstCell || !lastCell) {
		return [];
	}
	const gridStartDate = parseDateKey(formatDateKey(firstCell.date));
	const gridEndDate = parseDateKey(formatDateKey(lastCell.date));
	const segments: LayoutEventSegment[] = [];
	for (const event of events) {
		for (const part of toNormalizedSegments(event)) {
			const startDate = parseDateKey(part.start);
			const endDate = parseDateKey(part.end);
			if (endDate < gridStartDate || startDate > gridEndDate) {
				continue;
			}
			const clampedStartDate = startDate < gridStartDate ? gridStartDate : startDate;
			const clampedEndDate = endDate > gridEndDate ? gridEndDate : endDate;
			const clampedStart = formatDateKey(clampedStartDate);
			const clampedEnd = formatDateKey(clampedEndDate);
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
			return compareEventTimeMinutesThenTitle(
				toMinutes(a.event.startTime),
				toMinutes(b.event.startTime),
				a.event.title,
				b.event.title,
			);
		}
		return 0;
	});
	const rows: EventRows = [];
	const activeRows = new MinHeap<ActiveEventRow>(
		(left, right) => left.endIndex - right.endIndex || left.rowIndex - right.rowIndex,
	);
	const availableRows = new MinHeap<number>((left, right) => left - right);
	for (const segment of segments) {
		while ((activeRows.peek()?.endIndex ?? Number.POSITIVE_INFINITY) < segment.startIndex) {
			const expired = activeRows.pop();
			if (expired) availableRows.push(expired.rowIndex);
		}
		const rowIndex = availableRows.pop() ?? rows.length;
		const row = rows[rowIndex];
		if (row) {
			row.push(segment);
		} else {
			rows[rowIndex] = [segment];
		}
		activeRows.push({ endIndex: segment.endIndex, rowIndex });
	}
	return rows;
};
