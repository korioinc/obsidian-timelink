import { buildEventId } from './model-utils';
import type { CalendarEvent, EditableEventResponse, EventLocation } from './types';

export type LocatedEventEntry = {
	id: string;
	event: CalendarEvent & { id: string };
	location: EventLocation;
};

export const buildLocatedEventEntries = (events: EditableEventResponse[]): LocatedEventEntry[] =>
	events.map(([event, location], index) => {
		const id = buildEventId(event, index);
		return {
			id,
			event: { ...event, id },
			location,
		};
	});

export const buildLocationByEntryId = (entries: LocatedEventEntry[]): Map<string, EventLocation> =>
	new Map(entries.map((entry) => [entry.id, entry.location]));
