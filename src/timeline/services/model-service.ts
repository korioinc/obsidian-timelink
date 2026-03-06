import { isDateKeyInRange, resolveNormalizedEventDateRange } from '../../shared/event/date-range';
import { buildLocatedEventEntries } from '../../shared/event/located-event-entries';
import { formatDateKey, isToday, toMinutes } from '../../shared/event/model-utils';
import type { EditableEventResponse, EventSegment } from '../../shared/event/types';
import { deriveNowTop } from '../../shared/time-grid/now-indicator';
import { buildTimedDayEntries } from '../../shared/time-grid/timed-events-grid';
import type {
	BuildTimelineTimedVisualModelParams,
	TimelineDayModel,
	TimelineTimedVisualModel,
} from '../types';
import { collectUnscheduledTasksForDay } from '../utils/unscheduled-tasks';

const buildTimelineEventSegmentsWithLocations = (
	events: EditableEventResponse[],
	dayKey: string,
): EventSegment[] => {
	const segments: EventSegment[] = [];
	buildLocatedEventEntries(events).forEach(({ id, event, location }) => {
		const range = resolveNormalizedEventDateRange(event);
		if (!range) return;
		if (!isDateKeyInRange(dayKey, range)) {
			return;
		}
		segments.push({
			id,
			event: { ...event, id },
			location,
			start: dayKey,
			end: dayKey,
			span: 1,
			startIndex: 0,
			endIndex: 0,
		});
	});
	segments.sort((left, right) => {
		const leftMinutes = toMinutes(left.event.startTime);
		const rightMinutes = toMinutes(right.event.startTime);
		if (leftMinutes !== null || rightMinutes !== null) {
			if (leftMinutes === null) return 1;
			if (rightMinutes === null) return -1;
			if (leftMinutes !== rightMinutes) return leftMinutes - rightMinutes;
		}
		return left.event.title.localeCompare(right.event.title);
	});
	return segments;
};

export const buildTimelineHeaderTitle = (date: Date): string =>
	`${isToday(date) ? '🟢 ' : ''}${formatDateKey(date)}`;

export const buildTimelineDayModel = (
	events: EditableEventResponse[],
	currentDate: Date,
): TimelineDayModel => {
	const dayCell = {
		date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
		inMonth: true as const,
	};
	const dayKey = formatDateKey(dayCell.date);
	const eventSegments = buildTimelineEventSegmentsWithLocations(events, dayKey);
	const unscheduledTasks = collectUnscheduledTasksForDay(eventSegments, dayKey);

	return {
		dayCell,
		dayKey,
		eventSegments,
		unscheduledTasks,
	};
};

export const buildTimelineTimedVisualModel = ({
	eventSegments,
	dayKey,
	dayDate,
	timedResizing,
	timedResizeRange,
	timedDragging,
	timedDragRange,
	now,
	slotMinutes,
	slotHeight,
}: BuildTimelineTimedVisualModelParams): TimelineTimedVisualModel => {
	const timedEventsForDay = buildTimedDayEntries({
		segments: eventSegments,
		dayKey,
		dayOffset: 0,
		timedResizing,
		timedResizeRange,
		timedDragging,
		timedDragRange,
	});
	const showNowIndicator = isToday(dayDate);
	const nowTop = deriveNowTop(now, slotMinutes, slotHeight);

	return {
		timedEventsForDay,
		showNowIndicator,
		nowTop,
	};
};
