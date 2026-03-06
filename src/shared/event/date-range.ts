import {
	addDays,
	compareDateKey,
	diffInDays,
	formatDateKey,
	parseDateKey,
	toMinutes,
} from './model-utils';
import type { CalendarEvent } from './types';

type DateRange = {
	startKey: string;
	endKey: string;
};

export const resolveNormalizedEventDateRange = (
	event: Pick<CalendarEvent, 'allDay' | 'date' | 'endDate' | 'endTime'>,
): DateRange | null => {
	if (!event.date) return null;
	const startKey = event.date;
	let endKey = event.endDate ?? startKey;
	const endMinutes = toMinutes(event.endTime);
	// Treat next-day 00:00 as an exclusive boundary for timed events.
	if (!event.allDay && endMinutes === 0 && event.endDate && event.endDate !== startKey) {
		endKey = formatDateKey(addDays(parseDateKey(event.endDate), -1));
	}
	if (compareDateKey(endKey, startKey) < 0) {
		endKey = startKey;
	}
	return { startKey, endKey };
};

export const getShiftedDateRange = (
	startKey: string,
	endKey: string,
	targetStartKey: string,
): { start: string; end: string } => {
	const baseStartDate = parseDateKey(startKey);
	const baseEndDate = parseDateKey(endKey);
	const targetStartDate = parseDateKey(targetStartKey);
	const offset = diffInDays(baseStartDate, targetStartDate);
	return {
		start: formatDateKey(addDays(baseStartDate, offset)),
		end: formatDateKey(addDays(baseEndDate, offset)),
	};
};

export const isDateKeyInRange = (dateKey: string, range: DateRange): boolean => {
	return compareDateKey(dateKey, range.startKey) >= 0 && compareDateKey(dateKey, range.endKey) <= 0;
};
