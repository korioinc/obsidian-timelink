import type { CalendarEvent, EditableEventResponse, EventLocation } from './types';

export const canMoveEvent = (event: CalendarEvent): boolean => Boolean(event.date);

export const isSameEventLocation = (left: EventLocation, right: EventLocation): boolean =>
	left.file.path === right.file.path && left.lineNumber === right.lineNumber;

export const updateEventLocation = (
	events: EditableEventResponse[],
	previous: EventLocation,
	next: EventLocation,
): EditableEventResponse[] =>
	events.map(([event, location]) =>
		isSameEventLocation(location, previous)
			? ([event, next] as EditableEventResponse)
			: [event, location],
	);

export const updateEventEntry = (
	events: EditableEventResponse[],
	previous: EventLocation,
	next: EventLocation,
	updatedEvent: EditableEventResponse[0],
): EditableEventResponse[] =>
	events.map(([event, location]) =>
		isSameEventLocation(location, previous) || isSameEventLocation(location, next)
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
	const withLocation = !isSameEventLocation(updatedLocation, previous[1])
		? updateEventLocation(events, updatedLocation, previous[1])
		: events;
	return updateEventEntry(withLocation, previous[1], previous[1], previous[0]);
};
