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

const getDurationMinutes = (start: number, end: number) => Math.max(0, end - start);

export const isTimedEvent = (event: CalendarEvent) => {
	if (event.allDay) return false;
	if (!event.date) return false;
	const start = toMinutes(event.startTime);
	const end = toMinutes(event.endTime);
	if (start === null || end === null) return false;
	if (event.endDate && event.endDate !== event.date) return true;
	return end > start;
};

export const assignColumns = (
	entries: Array<{
		segment: EventSegment;
		dayOffset: number;
		startMinutes: number;
		endMinutes: number;
	}>,
): TimedEventPlacement[] => {
	const result: TimedEventPlacement[] = [];
	const sorted = [...entries].sort((a, b) => {
		if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
		const aDuration = getDurationMinutes(a.startMinutes, a.endMinutes);
		const bDuration = getDurationMinutes(b.startMinutes, b.endMinutes);
		if (aDuration !== bDuration) return bDuration - aDuration;
		return a.segment.event.title.localeCompare(b.segment.event.title);
	});
	let active: TimedEventPlacement[] = [];
	for (const entry of sorted) {
		active = active.filter((item) => item.endMinutes > entry.startMinutes);
		const usedColumns = new Set(active.map((item) => item.column));
		let column = 0;
		while (usedColumns.has(column)) {
			column += 1;
		}
		const placement: TimedEventPlacement = {
			segment: entry.segment,
			dayOffset: entry.dayOffset,
			startMinutes: entry.startMinutes,
			endMinutes: entry.endMinutes,
			column,
			columnCount: 1,
		};
		active.push(placement);
		const maxColumn = Math.max(...active.map((item) => item.column));
		const columnCount = maxColumn + 1;
		for (const item of active) {
			item.columnCount = Math.max(item.columnCount, columnCount);
		}
		result.push(placement);
	}
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
