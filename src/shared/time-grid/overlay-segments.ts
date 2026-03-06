import { MINUTES_IN_DAY } from '../event/model-utils';
import type { TimeSelectionRange } from '../event/types';
import type { TimeGridOverlaySegment } from './types';

export const buildSingleColumnSegments = (
	dateKey: string,
	range: TimeSelectionRange | null,
): TimeGridOverlaySegment[] => {
	if (!range || range.startDateKey !== dateKey) return [];
	const endMinutes = range.endDateKey === dateKey ? range.endMinutes : MINUTES_IN_DAY;
	return [{ columnIndex: 0, startMinutes: range.startMinutes, endMinutes }];
};

export const buildBoundedRangeSegments = (
	bounds: { startIndex: number; endIndex: number } | null,
	range: TimeSelectionRange | null,
): TimeGridOverlaySegment[] => {
	if (!bounds || !range) return [];
	const segments: TimeGridOverlaySegment[] = [];
	for (let columnIndex = bounds.startIndex; columnIndex <= bounds.endIndex; columnIndex += 1) {
		const isStart = columnIndex === bounds.startIndex;
		const isEnd = columnIndex === bounds.endIndex;
		segments.push({
			columnIndex,
			startMinutes: isStart ? range.startMinutes : 0,
			endMinutes: isEnd ? range.endMinutes : MINUTES_IN_DAY,
		});
	}
	return segments;
};
