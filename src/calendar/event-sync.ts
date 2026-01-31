import type { EditableEventResponse, EventLocation } from './calendar';
import type { CalendarEvent } from './types';

export const canMoveEvent = (event: CalendarEvent): boolean => Boolean(event.date);

export const updateEventLocation = (
	events: EditableEventResponse[],
	previous: EventLocation,
	next: EventLocation,
): EditableEventResponse[] =>
	events.map(([event, location]) =>
		location === previous ? ([event, next] as EditableEventResponse) : [event, location],
	);

export const updateEventEntry = (
	events: EditableEventResponse[],
	previous: EventLocation,
	next: EventLocation,
	updatedEvent: EditableEventResponse[0],
): EditableEventResponse[] =>
	events.map(([event, location]) =>
		location === previous || location === next
			? ([updatedEvent, next] as EditableEventResponse)
			: [event, location],
	);

export const applyOptimisticMove = (
	events: EditableEventResponse[],
	previous: EditableEventResponse,
	nextEvent: EditableEventResponse[0],
): EditableEventResponse[] => updateEventEntry(events, previous[1], previous[1], nextEvent);

export const rollbackOptimisticMove = (
	events: EditableEventResponse[],
	previous: EditableEventResponse,
	updatedLocation: EventLocation,
): EditableEventResponse[] => {
	const withLocation =
		updatedLocation !== previous[1]
			? updateEventLocation(events, updatedLocation, previous[1])
			: events;
	return updateEventEntry(withLocation, previous[1], previous[1], previous[0]);
};
