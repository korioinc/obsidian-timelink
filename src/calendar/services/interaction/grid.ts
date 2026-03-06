import {
	buildLocatedEventEntries,
	buildLocationByEntryId,
} from '../../../shared/event/located-event-entries';
import { formatDateKey } from '../../../shared/event/model-utils';
import type { EditableEventResponse } from '../../../shared/event/types';
import type { DayCellData } from '../../utils/date-grid';
import { buildEventRows } from '../../utils/month-event-rows';

export const deriveGridByIndex = (grid: DayCellData[]) =>
	grid.map((cell) => ({
		date: cell.date,
		key: formatDateKey(cell.date),
		inMonth: cell.inMonth,
	}));

export const deriveIndexByDateKey = (gridByIndex: Array<{ key: string }>) =>
	new Map(gridByIndex.map((cell, index) => [cell.key, index]));

export const buildEventRowsWithLocations = (
	events: EditableEventResponse[],
	grid: DayCellData[],
) => {
	const entries = buildLocatedEventEntries(events);
	const locationById = buildLocationByEntryId(entries);
	return buildEventRows(
		entries.map((entry) => entry.event),
		grid,
	).map((row) =>
		row.map((segment) => ({
			id: segment.event.id ?? '',
			event: segment.event,
			location: locationById.get(segment.event.id ?? '') ?? {
				file: { path: '' },
				lineNumber: undefined,
			},
			start: segment.start,
			end: segment.end,
			span: segment.span,
			startIndex: segment.startIndex,
			endIndex: segment.endIndex,
		})),
	);
};
