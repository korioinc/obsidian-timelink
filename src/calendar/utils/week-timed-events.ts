import type { CalendarEvent, EventSegment, TimedEventPlacement } from '../types';

export const MINUTES_IN_DAY = 24 * 60;
export const SLOT_MINUTES = 30;

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

export const getDurationMinutes = (start: number, end: number) => Math.max(0, end - start);

export const clampColumnIndex = (value: number) => Math.min(6, Math.max(0, value));

export const isCrossMidnight = (event: CalendarEvent) =>
	Boolean(event.endDate && event.date && event.endDate !== event.date);

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
