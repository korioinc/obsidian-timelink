import { isTimedEvent, toMinutes } from '../../shared/event/model-utils';
import type { EditableEventResponse } from '../../shared/event/types';
import { buildEventRowsWithLocations, deriveGridByIndex } from '../services/interaction/grid';
import type { EventSegment } from '../types';
import { buildWeekGrid } from '../utils/date-grid';
import { useMemo } from 'preact/hooks';

type ListSection = {
	date: Date;
	key: string;
	allDay: EventSegment[];
	timed: EventSegment[];
};

const getSortMinutes = (segment: EventSegment) => {
	if (!isTimedEvent(segment.event)) return Number.POSITIVE_INFINITY;
	return toMinutes(segment.event.startTime) ?? Number.POSITIVE_INFINITY;
};

const isAllDayEvent = (segment: EventSegment) =>
	segment.event.allDay || !isTimedEvent(segment.event);

const resolveSegmentRange = (
	segment: EventSegment,
	gridByIndex: Array<{ key: string }>,
	indexByDateKey: Map<string, number>,
) => {
	let startIndex = segment.startIndex;
	let endIndex = segment.endIndex;
	const hasAccurateIndex =
		startIndex >= 0 &&
		endIndex >= startIndex &&
		gridByIndex[startIndex]?.key === segment.start &&
		gridByIndex[endIndex]?.key === segment.end;
	if (!hasAccurateIndex) {
		const fallbackStart = indexByDateKey.get(segment.start);
		const fallbackEnd = indexByDateKey.get(segment.end);
		if (fallbackStart === undefined || fallbackEnd === undefined) return null;
		startIndex = fallbackStart;
		endIndex = fallbackEnd;
	}
	return { startIndex, endIndex };
};

export const buildListSections = (
	gridByIndex: Array<{ date: Date; key: string }>,
	flattened: EventSegment[],
): ListSection[] => {
	const sections = gridByIndex.map((cell) => ({
		date: cell.date,
		key: cell.key,
		allDay: [] as EventSegment[],
		timed: [] as EventSegment[],
	}));
	if (sections.length === 0) return sections;

	const indexByDateKey = new Map(gridByIndex.map((cell, index) => [cell.key, index]));
	const maxIndex = sections.length - 1;

	for (const segment of flattened) {
		const range = resolveSegmentRange(segment, gridByIndex, indexByDateKey);
		if (!range) continue;
		const startIndex = Math.max(0, range.startIndex);
		const endIndex = Math.min(maxIndex, range.endIndex);
		if (startIndex > endIndex) continue;
		const allDay = isAllDayEvent(segment);
		for (let index = startIndex; index <= endIndex; index += 1) {
			const section = sections[index];
			if (!section) continue;
			if (allDay) {
				section.allDay.push(segment);
			} else {
				section.timed.push(segment);
			}
		}
	}

	for (const section of sections) {
		section.timed.sort((a, b) => getSortMinutes(a) - getSortMinutes(b));
	}

	return sections;
};

export const useListSections = (
	events: EditableEventResponse[],
	currentDate: Date,
): ListSection[] => {
	const weekGrid = useMemo(() => buildWeekGrid(currentDate, 0), [currentDate]);
	const gridByIndex = useMemo(() => deriveGridByIndex(weekGrid), [weekGrid]);
	const eventRows = useMemo(
		() => buildEventRowsWithLocations(events, weekGrid),
		[events, weekGrid],
	);
	const flattened = useMemo(() => eventRows.flat(), [eventRows]);

	return useMemo(() => buildListSections(gridByIndex, flattened), [flattened, gridByIndex]);
};
