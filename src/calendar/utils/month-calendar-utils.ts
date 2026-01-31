import type { CalendarEvent } from '../types';

export const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const EVENT_ROW_HEIGHT = 20;
export const EVENT_ROW_GAP = 2;
export const EVENT_ROW_SPACING = EVENT_ROW_HEIGHT + EVENT_ROW_GAP;
export const DEFAULT_EVENT_COLOR = 'var(--interactive-accent)';

export const formatMonthTitle = (date: Date): string => {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	return `${month} / ${year}`;
};

export const formatWeekTitle = (date: Date): string => {
	const start = startOfWeek(date);
	const end = addDays(start, 6);
	const year = end.getFullYear();
	const month = String(end.getMonth() + 1).padStart(2, '0');
	const startDay = String(start.getDate()).padStart(2, '0');
	const endDay = String(end.getDate()).padStart(2, '0');
	return `${startDay} - ${endDay}, ${month} / ${year}`;
};

export const formatDayTitle = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${month} / ${day} / ${year}`;
};

export const startOfWeek = (date: Date): Date => {
	const start = new Date(date);
	const day = start.getDay();
	start.setDate(start.getDate() - day);
	start.setHours(0, 0, 0, 0);
	return start;
};

export const formatDateKey = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

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

export const buildEventId = (event: CalendarEvent, index: number): string => {
	return event.id ?? `${event.title}-${event.date ?? event.startDate ?? 'event'}-${index}`;
};

export const normalizeEventColor = (color?: string): string | null => {
	if (!color) return null;
	const trimmed = color.trim();
	return trimmed.length > 0 ? trimmed : null;
};

export const normalizeHexColor = (value?: string): string | null => {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (!trimmed.startsWith('#')) return null;
	const upper = trimmed.toUpperCase();
	if (upper.length === 4) {
		return (
			'#' +
			upper
				.slice(1)
				.split('')
				.map((char) => char + char)
				.join('')
		);
	}
	if (upper.length === 7) return upper;
	return null;
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
