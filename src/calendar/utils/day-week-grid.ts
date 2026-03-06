import { formatDateKey } from '../../shared/event/model-utils';
import { deriveNowIndicatorState } from '../../shared/time-grid/now-indicator';
import { buildTimedDayEntries } from '../../shared/time-grid/timed-events-grid';
import type { EventSegment, TimeSelectionRange, TimedEventPlacement } from '../types';

type DayKeyOffset = {
	dayKey: string;
	dayOffset: number;
};

type BuildTimedPlacementsForDaysParams = {
	days: DayKeyOffset[];
	segments: EventSegment[];
	timedResizing: EventSegment | null;
	timedResizeRange: TimeSelectionRange | null;
	timedDragging: EventSegment | null;
	timedDragRange: TimeSelectionRange | null;
};

export const buildTimedPlacementsForDays = ({
	days,
	segments,
	timedResizing,
	timedResizeRange,
	timedDragging,
	timedDragRange,
}: BuildTimedPlacementsForDaysParams): TimedEventPlacement[] => {
	const placements: TimedEventPlacement[] = [];
	for (const day of days) {
		placements.push(
			...buildTimedDayEntries({
				segments,
				dayKey: day.dayKey,
				dayOffset: day.dayOffset,
				timedResizing,
				timedResizeRange,
				timedDragging,
				timedDragRange,
			}),
		);
	}
	return placements;
};

export const deriveTimedPlacementDays = (dates: Date[]): DayKeyOffset[] =>
	dates.map((date, dayOffset) => ({
		dayKey: formatDateKey(date),
		dayOffset,
	}));

type DeriveNowIndicatorParams = {
	dates: Date[];
	isToday: (date: Date) => boolean;
	now: Date;
	slotMinutes: number;
	slotHeight: number;
};

export const deriveNowIndicator = ({
	dates,
	isToday,
	now,
	slotMinutes,
	slotHeight,
}: DeriveNowIndicatorParams) =>
	deriveNowIndicatorState({
		dates,
		isToday,
		now,
		slotMinutes,
		slotHeight,
	});
