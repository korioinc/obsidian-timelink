import {
	createEventEntry,
	createUpdateLocationHandler,
	deleteEventEntry,
	loadEventEntries,
	moveEventEntry,
	saveEventEntry,
	type EventServiceDeps,
} from '../event/event-service';
import type { CalendarEvent, EditableEventResponse } from '../event/types';
import { createNotice } from '../services/notice-service';
import { useVaultPathDataLoader } from './use-vault-path-data-loader';
import type { App } from 'obsidian';
import { useCallback, useMemo, useState } from 'preact/hooks';

export type EventEntriesCalendar = EventServiceDeps['calendar'] & {
	getDirectory: () => string;
};

type UseEventEntriesControllerParams = {
	app: App;
	calendar: EventEntriesCalendar;
	creator: CalendarEvent['creator'];
};

type UseEventEntriesControllerResult = {
	events: EditableEventResponse[];
	loadError: string | null;
	notice: (message: string) => void;
	handleSaveEvent: (next: EditableEventResponse, previous: EditableEventResponse) => Promise<void>;
	handleDeleteEvent: (entry: EditableEventResponse) => Promise<void>;
	handleMoveEvent: (next: EditableEventResponse, previous: EditableEventResponse) => Promise<void>;
	handleCreateEvent: (event: CalendarEvent) => Promise<void>;
};

export const useEventEntriesController = ({
	app,
	calendar,
	creator,
}: UseEventEntriesControllerParams): UseEventEntriesControllerResult => {
	const [events, setEvents] = useState<EditableEventResponse[]>([]);
	const notice = useMemo(() => createNotice(), []);
	const calendarDirectory = useMemo(() => calendar.getDirectory(), [calendar]);

	const loadEvents = useCallback(async () => loadEventEntries(calendar), [calendar]);
	const { loadError, scheduleReload } = useVaultPathDataLoader({
		app,
		directory: calendarDirectory,
		load: loadEvents,
		onLoaded: setEvents,
		errorMessage: 'Failed to load the calendar.',
		errorLogLabel: 'Failed to load calendar events',
	});

	const updateLocation = useMemo(() => createUpdateLocationHandler(setEvents), []);
	const eventServiceDeps = useMemo<EventServiceDeps>(
		() => ({
			calendar,
			setEvents,
			scheduleReload,
			notice,
			updateLocation,
		}),
		[calendar, notice, scheduleReload, updateLocation],
	);

	const handleSaveEvent = useCallback(
		async (next: EditableEventResponse, previous: EditableEventResponse) => {
			await saveEventEntry(eventServiceDeps, next, previous);
		},
		[eventServiceDeps],
	);

	const handleDeleteEvent = useCallback(
		async (entry: EditableEventResponse) => {
			await deleteEventEntry(eventServiceDeps, entry);
		},
		[eventServiceDeps],
	);

	const handleMoveEvent = useCallback(
		async (next: EditableEventResponse, previous: EditableEventResponse) => {
			await moveEventEntry(eventServiceDeps, next, previous);
		},
		[eventServiceDeps],
	);

	const handleCreateEvent = useCallback(
		async (event: CalendarEvent) => {
			await createEventEntry(eventServiceDeps, event, creator);
		},
		[creator, eventServiceDeps],
	);

	return {
		events,
		loadError,
		notice,
		handleSaveEvent,
		handleDeleteEvent,
		handleMoveEvent,
		handleCreateEvent,
	};
};
