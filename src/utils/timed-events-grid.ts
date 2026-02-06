import type { EventSegment, TimedEventPlacement, TimeSelectionRange } from '../calendar/types';
import {
	addDays,
	compareDateKey,
	diffInDays,
	formatDateKey,
	parseDateKey,
} from '../calendar/utils/month-calendar-utils';
import {
	MINUTES_IN_DAY,
	assignColumns,
	isTimedEvent,
	toMinutes,
} from '../calendar/utils/week-timed-events';

type BuildTimedEntriesParams = {
	segments: EventSegment[];
	dayKey: string;
	dayOffset: number;
	timedResizing: EventSegment | null;
	timedResizeRange: TimeSelectionRange | null;
	timedDragging: EventSegment | null;
	timedDragRange: TimeSelectionRange | null;
};

type ShiftedTimedRangeParams = {
	baseStartKey: string;
	baseEndKey: string;
	hoverKey: string;
	baseStartMinutes: number;
	baseEndMinutes: number;
	hoverMinutes: number;
};

const clampMinutes = (value: number) => Math.max(0, Math.min(MINUTES_IN_DAY, value));

export const getShiftedTimedRange = ({
	baseStartKey,
	baseEndKey,
	hoverKey,
	baseStartMinutes,
	baseEndMinutes,
	hoverMinutes,
}: ShiftedTimedRangeParams) => {
	const baseSpanDays = diffInDays(parseDateKey(baseStartKey), parseDateKey(baseEndKey));
	const durationMinutes = Math.max(
		0,
		baseSpanDays * MINUTES_IN_DAY + (baseEndMinutes - baseStartMinutes),
	);
	const startMinutes = clampMinutes(baseStartMinutes + (hoverMinutes - baseStartMinutes));
	const totalEndMinutes = startMinutes + durationMinutes;
	const endDayOffset = Math.floor(totalEndMinutes / MINUTES_IN_DAY);
	const endMinutes = totalEndMinutes - endDayOffset * MINUTES_IN_DAY;
	const endDateKey = formatDateKey(addDays(parseDateKey(hoverKey), endDayOffset));
	return {
		startMinutes,
		endMinutes,
		endDateKey,
	};
};

export const buildTimedDayEntries = ({
	segments,
	dayKey,
	dayOffset,
	timedResizing,
	timedResizeRange,
	timedDragging,
	timedDragRange,
}: BuildTimedEntriesParams): TimedEventPlacement[] => {
	const entries: Array<{
		segment: EventSegment;
		dayOffset: number;
		startMinutes: number;
		endMinutes: number;
	}> = [];
	const pushEntry = (segment: EventSegment, startMinutes: number, endMinutes: number) => {
		const clampedStart = clampMinutes(startMinutes);
		const clampedEnd = clampMinutes(endMinutes);
		// Hide zero-length slices (e.g. next-day 00:00 tail segments).
		if (clampedEnd <= clampedStart) {
			return;
		}
		entries.push({
			segment,
			dayOffset,
			startMinutes: clampedStart,
			endMinutes: clampedEnd,
		});
	};

	for (const segment of segments) {
		const event = segment.event;
		if (!isTimedEvent(event)) continue;
		const startKey = event.date ?? segment.start;
		const endKey = event.endDate ?? segment.end ?? startKey;
		if (compareDateKey(dayKey, startKey) < 0 || compareDateKey(dayKey, endKey) > 0) {
			continue;
		}
		const isStartDay = dayKey === startKey;
		const isEndDay = dayKey === endKey;
		const startMinutes = isStartDay ? (toMinutes(event.startTime) ?? 0) : 0;
		const endMinutes = isEndDay ? (toMinutes(event.endTime) ?? MINUTES_IN_DAY) : MINUTES_IN_DAY;
		pushEntry(segment, startMinutes, endMinutes);
	}

	if (timedResizing && timedResizeRange) {
		const rangeStartKey =
			compareDateKey(timedResizeRange.startDateKey, timedResizeRange.endDateKey) <= 0
				? timedResizeRange.startDateKey
				: timedResizeRange.endDateKey;
		const rangeEndKey =
			compareDateKey(timedResizeRange.startDateKey, timedResizeRange.endDateKey) <= 0
				? timedResizeRange.endDateKey
				: timedResizeRange.startDateKey;
		if (compareDateKey(dayKey, rangeStartKey) >= 0 && compareDateKey(dayKey, rangeEndKey) <= 0) {
			const hasEntry = entries.some((entry) => entry.segment.id === timedResizing.id);
			if (!hasEntry) {
				const startMinutes =
					dayKey === rangeStartKey ? (toMinutes(timedResizing.event.startTime) ?? 0) : 0;
				const endMinutes = dayKey === rangeEndKey ? timedResizeRange.endMinutes : MINUTES_IN_DAY;
				pushEntry(timedResizing, startMinutes, endMinutes);
			}
		}
	}

	if (timedDragging && timedDragRange) {
		const rangeStartKey =
			compareDateKey(timedDragRange.startDateKey, timedDragRange.endDateKey) <= 0
				? timedDragRange.startDateKey
				: timedDragRange.endDateKey;
		const rangeEndKey =
			compareDateKey(timedDragRange.startDateKey, timedDragRange.endDateKey) <= 0
				? timedDragRange.endDateKey
				: timedDragRange.startDateKey;
		if (compareDateKey(dayKey, rangeStartKey) >= 0 && compareDateKey(dayKey, rangeEndKey) <= 0) {
			for (let index = entries.length - 1; index >= 0; index -= 1) {
				const entry = entries[index];
				if (entry && entry.segment.id === timedDragging.id) {
					entries.splice(index, 1);
				}
			}
			const startMinutes = dayKey === rangeStartKey ? timedDragRange.startMinutes : 0;
			const endMinutes = dayKey === rangeEndKey ? timedDragRange.endMinutes : MINUTES_IN_DAY;
			pushEntry(timedDragging, startMinutes, endMinutes);
		}
	}

	return assignColumns(entries);
};
