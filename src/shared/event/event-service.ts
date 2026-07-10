import {
	applyOptimisticMove,
	isSameEventLocation,
	rollbackOptimisticMove,
	updateEventEntry,
	updateEventLocation,
} from './event-sync';
import type {
	CalendarEvent,
	DeleteEventOptions,
	EditableEventResponse,
	EventLocation,
} from './types';

export type EventServiceCalendar = {
	createEvent: (event: CalendarEvent, body?: string) => Promise<EventLocation>;
	deleteEvent: (
		location: EventLocation,
		options?: DeleteEventOptions,
	) => Promise<EventLocation | void>;
	getEvents: () => Promise<EditableEventResponse[]>;
	modifyEvent: (
		location: EventLocation,
		event: CalendarEvent,
		updateCacheWithLocation: (location: EventLocation) => void,
	) => Promise<void>;
};

type EventServiceSetEvents = (
	updater: (current: EditableEventResponse[]) => EditableEventResponse[],
) => void;

type EventServiceUpdateLocation = (previous: EventLocation, next: EventLocation) => void;

export type EventServiceDeps = {
	calendar: Pick<EventServiceCalendar, 'createEvent' | 'deleteEvent' | 'getEvents' | 'modifyEvent'>;
	setEvents: EventServiceSetEvents;
	scheduleReload: () => void;
	notice: (message: string) => void;
	updateLocation: EventServiceUpdateLocation;
	beginModification: (location: EventLocation) => () => boolean;
};

export const createEventModificationGuard = (): EventServiceDeps['beginModification'] => {
	const generationsByLocation = new Map<string, number>();
	return (location) => {
		const key = `${location.file.path}:${location.lineNumber ?? ''}`;
		const generation = (generationsByLocation.get(key) ?? 0) + 1;
		generationsByLocation.set(key, generation);
		return () => generationsByLocation.get(key) === generation;
	};
};

export const loadEventEntries = async (
	calendar: EventServiceDeps['calendar'],
): Promise<EditableEventResponse[]> => {
	return calendar.getEvents();
};

const updateEventLocationInState = (
	setEvents: EventServiceSetEvents,
	previous: EventLocation,
	next: EventLocation,
): void => {
	setEvents((current) => updateEventLocation(current, previous, next));
};

type ModifyEventFlowOptions = {
	applyOptimisticState: () => void;
	applySuccessState: (updatedLocation: EventLocation) => void;
	applyFailureState: (updatedLocation: EventLocation) => void;
	logMessage: string;
	noticeMessage: string;
	uncertainNoticeMessage: string;
};

const isEventStateUncertain = (error: unknown): boolean =>
	typeof error === 'object' &&
	error !== null &&
	'eventStateUncertain' in error &&
	(error as { eventStateUncertain?: unknown }).eventStateUncertain === true;

const runModifyEventFlow = async (
	deps: EventServiceDeps,
	next: EditableEventResponse,
	previous: EditableEventResponse,
	options: ModifyEventFlowOptions,
): Promise<void> => {
	let updatedLocation = previous[1];
	const isCurrent = deps.beginModification(previous[1]);
	options.applyOptimisticState();
	deps.scheduleReload();
	try {
		await deps.calendar.modifyEvent(previous[1], next[0], (location) => {
			updatedLocation = location;
			if (isCurrent()) deps.updateLocation(previous[1], location);
		});
		if (isCurrent()) options.applySuccessState(updatedLocation);
	} catch (error) {
		if (isEventStateUncertain(error)) {
			deps.scheduleReload();
			console.error(options.logMessage, error);
			deps.notice(options.uncertainNoticeMessage);
			return;
		}
		if (!isCurrent()) return;
		options.applyFailureState(updatedLocation);
		console.error(options.logMessage, error);
		deps.notice(options.noticeMessage);
	}
};

export const saveEventEntry = async (
	deps: EventServiceDeps,
	next: EditableEventResponse,
	previous: EditableEventResponse,
): Promise<void> => {
	await runModifyEventFlow(deps, next, previous, {
		applyOptimisticState: () => {
			deps.setEvents((current) => updateEventEntry(current, previous[1], previous[1], next[0]));
		},
		applySuccessState: (updatedLocation) => {
			deps.setEvents((current) => updateEventEntry(current, previous[1], updatedLocation, next[0]));
		},
		applyFailureState: (updatedLocation) => {
			deps.setEvents((current) =>
				updateEventEntry(current, updatedLocation, previous[1], previous[0]),
			);
		},
		logMessage: 'Failed to modify calendar event',
		noticeMessage: 'Failed to save the event.',
		uncertainNoticeMessage: 'The event may be partially saved. Reloading the calendar.',
	});
};

export const moveEventEntry = async (
	deps: EventServiceDeps,
	next: EditableEventResponse,
	previous: EditableEventResponse,
): Promise<void> => {
	await runModifyEventFlow(deps, next, previous, {
		applyOptimisticState: () => {
			deps.setEvents((current) => applyOptimisticMove(current, previous, next[0]));
		},
		applySuccessState: (updatedLocation) => {
			deps.setEvents((current) => updateEventEntry(current, previous[1], updatedLocation, next[0]));
		},
		applyFailureState: (updatedLocation) => {
			deps.setEvents((current) => rollbackOptimisticMove(current, previous, updatedLocation));
		},
		logMessage: 'Failed to move calendar event',
		noticeMessage: 'Failed to move the event.',
		uncertainNoticeMessage: 'The event may be partially moved. Reloading the calendar.',
	});
};

export const deleteEventEntry = async (
	deps: EventServiceDeps,
	entry: EditableEventResponse,
	options?: DeleteEventOptions,
): Promise<void> => {
	deps.beginModification(entry[1]);
	deps.scheduleReload();
	try {
		const deletedLocation = await deps.calendar.deleteEvent(entry[1], options);
		deps.setEvents((current) =>
			current.filter(
				([, location]) =>
					!isSameEventLocation(location, entry[1]) &&
					(!deletedLocation || !isSameEventLocation(location, deletedLocation)),
			),
		);
	} catch (error) {
		console.error('Failed to delete calendar event', error);
		deps.notice('Failed to delete the event.');
	}
};

export const createEventEntry = async (
	deps: EventServiceDeps,
	event: CalendarEvent,
	creator: CalendarEvent['creator'],
): Promise<void> => {
	deps.scheduleReload();
	try {
		const location = await deps.calendar.createEvent({ ...event, creator });
		deps.setEvents((current) => [...current, [event, location]]);
	} catch (error) {
		console.error('Failed to create calendar event', error);
		deps.notice('Failed to create the event.');
	}
};

export const createUpdateLocationHandler = (
	setEvents: EventServiceSetEvents,
): EventServiceUpdateLocation => {
	return (previous, next) => {
		updateEventLocationInState(setEvents, previous, next);
	};
};
