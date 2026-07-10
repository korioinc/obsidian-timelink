import { MinHeap } from '../utils/min-heap';
import type { CalendarEvent, EventSegment, TimedEventPlacement } from './types';

export const DEFAULT_EVENT_COLOR = 'var(--interactive-accent)';

export const formatDateKey = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const buildEventId = (event: CalendarEvent, index: number): string =>
	event.id ?? `${event.title}-${event.date ?? event.startDate ?? 'event'}-${index}`;

export const parseDateKey = (value: string): Date => {
	const [year, month, day] = value.split('-').map(Number);
	return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

export const compareDateKey = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const normalizeRange = (anchor: string, hover: string) =>
	compareDateKey(anchor, hover) <= 0
		? { start: anchor, end: hover }
		: { start: hover, end: anchor };

export const addDays = (date: Date, days: number): Date => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};

export const diffInDays = (start: Date, end: Date): number => {
	const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
	const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
	return Math.floor((endUtc - startUtc) / 86400000);
};

export const isToday = (date: Date): boolean => {
	const today = new Date();
	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	);
};

export const normalizeEventColor = (color?: string | null): string | null => {
	if (!color) return null;
	const trimmed = color.trim();
	return trimmed.length > 0 ? trimmed : null;
};

export const clampEventDate = (event: CalendarEvent, offsetDays: number): CalendarEvent => {
	if (!event.date) return event;
	const start = parseDateKey(event.date);
	const nextStart = addDays(start, offsetDays);
	let nextEndDate = event.endDate ?? null;
	if (event.endDate) {
		const end = parseDateKey(event.endDate);
		const nextEnd = addDays(end, offsetDays);
		nextEndDate = formatDateKey(nextEnd);
	}
	return {
		...event,
		date: formatDateKey(nextStart),
		endDate: nextEndDate,
	};
};

export const MINUTES_IN_DAY = 24 * 60;

export const toMinutes = (value?: string | null): number | null => {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const [hoursRaw, minutesRaw] = trimmed.split(':');
	const hours = Number(hoursRaw);
	const minutes = Number(minutesRaw);
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
	return hours * 60 + minutes;
};

const clampMinutes = (value: number) => Math.min(MINUTES_IN_DAY, Math.max(0, value));

export const formatTime = (minutes: number) => {
	const safe = clampMinutes(minutes);
	const hours = Math.floor(safe / 60);
	const mins = safe % 60;
	return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

type EffectiveTimedEventRange = {
	startKey: string;
	endKey: string;
	startMinutes: number;
	endMinutes: number;
};

export const resolveEffectiveTimedEventRange = (
	event: Pick<CalendarEvent, 'allDay' | 'date' | 'endDate' | 'startTime' | 'endTime'>,
): EffectiveTimedEventRange | null => {
	if (event.allDay) return null;
	if (!event.date) return null;
	const startMinutes = toMinutes(event.startTime);
	const endMinutes = toMinutes(event.endTime);
	if (startMinutes === null || endMinutes === null) return null;

	const startKey = event.date;
	let endKey = event.endDate || startKey;
	if (compareDateKey(endKey, startKey) < 0) {
		return null;
	}
	if (endKey !== startKey) {
		return { startKey, endKey, startMinutes, endMinutes };
	}
	if (endMinutes > startMinutes) {
		return { startKey, endKey, startMinutes, endMinutes };
	}
	if (!event.endDate && endMinutes < startMinutes) {
		endKey = formatDateKey(addDays(parseDateKey(startKey), 1));
		return { startKey, endKey, startMinutes, endMinutes };
	}
	return null;
};

const getDurationMinutes = (start: number, end: number) => Math.max(0, end - start);

export const isTimedEvent = (event: CalendarEvent) => {
	return resolveEffectiveTimedEventRange(event) !== null;
};

type TimedColumnEntry = {
	segment: EventSegment;
	dayOffset: number;
	startMinutes: number;
	endMinutes: number;
};

type ActiveTimedColumn = {
	endMinutes: number;
	column: number;
};

const createRangeMaximumQuery = (values: number[]) => {
	const valueCount = values.length;
	const tree = new Array<number>(valueCount * 2).fill(0);
	values.forEach((value, index) => {
		tree[valueCount + index] = value;
	});
	for (let index = valueCount - 1; index > 0; index -= 1) {
		tree[index] = Math.max(tree[index * 2] ?? 0, tree[index * 2 + 1] ?? 0);
	}

	return (startIndex: number, endIndex: number): number => {
		let left = startIndex + valueCount;
		let right = endIndex + valueCount;
		let maximum = 0;
		while (left <= right) {
			if (left % 2 === 1) {
				maximum = Math.max(maximum, tree[left] ?? 0);
				left += 1;
			}
			if (right % 2 === 0) {
				maximum = Math.max(maximum, tree[right] ?? 0);
				right -= 1;
			}
			left = Math.floor(left / 2);
			right = Math.floor(right / 2);
		}
		return maximum;
	};
};

const findFirstEntryStartingAtOrAfter = (
	entries: TimedColumnEntry[],
	targetMinutes: number,
): number => {
	let low = 0;
	let high = entries.length;
	while (low < high) {
		const middle = Math.floor((low + high) / 2);
		if ((entries[middle]?.startMinutes ?? Number.POSITIVE_INFINITY) < targetMinutes) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
};

export const assignColumns = (entries: TimedColumnEntry[]): TimedEventPlacement[] => {
	if (entries.length === 0) return [];
	const sorted = [...entries].sort((a, b) => {
		if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
		const aDuration = getDurationMinutes(a.startMinutes, a.endMinutes);
		const bDuration = getDurationMinutes(b.startMinutes, b.endMinutes);
		if (aDuration !== bDuration) return bDuration - aDuration;
		return a.segment.event.title.localeCompare(b.segment.event.title);
	});
	const activeColumns = new MinHeap<ActiveTimedColumn>(
		(left, right) => left.endMinutes - right.endMinutes || left.column - right.column,
	);
	const availableColumns = new MinHeap<number>((left, right) => left - right);
	const activeColumnFlags: boolean[] = [];
	const activeColumnsByDescendingIndex = new MinHeap<number>((left, right) => right - left);
	const columnCountsAfterInsertion: number[] = [];
	const result: TimedEventPlacement[] = [];
	let nextColumn = 0;
	for (const entry of sorted) {
		while ((activeColumns.peek()?.endMinutes ?? Number.POSITIVE_INFINITY) <= entry.startMinutes) {
			const expired = activeColumns.pop();
			if (!expired) break;
			activeColumnFlags[expired.column] = false;
			availableColumns.push(expired.column);
		}
		const availableColumn = availableColumns.pop();
		const column = availableColumn ?? nextColumn;
		if (availableColumn === undefined) nextColumn += 1;
		activeColumnFlags[column] = true;
		activeColumnsByDescendingIndex.push(column);
		activeColumns.push({ endMinutes: entry.endMinutes, column });
		const placement: TimedEventPlacement = {
			segment: entry.segment,
			dayOffset: entry.dayOffset,
			startMinutes: entry.startMinutes,
			endMinutes: entry.endMinutes,
			column,
			columnCount: 1,
		};
		result.push(placement);
		while (
			activeColumnsByDescendingIndex.peek() !== undefined &&
			!activeColumnFlags[activeColumnsByDescendingIndex.peek()!]
		) {
			activeColumnsByDescendingIndex.pop();
		}
		columnCountsAfterInsertion.push((activeColumnsByDescendingIndex.peek() ?? 0) + 1);
	}

	const queryMaximumColumnCount = createRangeMaximumQuery(columnCountsAfterInsertion);
	result.forEach((placement, index) => {
		const firstInactiveIndex = findFirstEntryStartingAtOrAfter(sorted, placement.endMinutes);
		const lastActiveIndex = Math.max(index, firstInactiveIndex - 1);
		placement.columnCount = queryMaximumColumnCount(index, lastActiveIndex);
	});
	return result;
};

type NavigationDirection = 'next' | 'prev';
export type CalendarLikeViewMode = 'month' | 'week' | 'day' | 'list';

export const shiftDateByViewMode = (
	currentDate: Date,
	viewMode: CalendarLikeViewMode,
	direction: NavigationDirection,
): Date => {
	const delta = direction === 'next' ? 1 : -1;
	const next = new Date(currentDate);
	if (viewMode === 'month') {
		next.setMonth(next.getMonth() + delta);
		return next;
	}
	if (viewMode === 'week' || viewMode === 'list') {
		next.setDate(next.getDate() + delta * 7);
		return next;
	}
	next.setDate(next.getDate() + delta);
	return next;
};
