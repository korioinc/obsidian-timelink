import { compareDateKey } from '../../shared/event/model-utils';
import type { EventSegment } from '../../shared/event/types';

export const collectUnscheduledTasksForDay = (
	eventSegments: EventSegment[],
	dayKey: string,
): EventSegment[] => {
	return eventSegments.filter((segment) => {
		const start = segment.event.startTime?.trim() ?? '';
		const end = segment.event.endTime?.trim() ?? '';
		if (start.length !== 0 || end.length !== 0) {
			return false;
		}
		const startCompare = compareDateKey(dayKey, segment.start);
		const endCompare = compareDateKey(dayKey, segment.end);
		return startCompare >= 0 && endCompare <= 0;
	});
};
