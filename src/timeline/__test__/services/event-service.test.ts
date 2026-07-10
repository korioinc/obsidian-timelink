import {
	createEventEntry,
	createEventModificationGuard,
	deleteEventEntry,
	saveEventEntry,
	type EventServiceDeps,
} from '../../../shared/event/event-service.ts';
import type {
	EditableEventResponse,
	EventLocation,
	CalendarEvent,
} from '../../../shared/event/types';
import { assert, test } from 'vitest';

const createLocation = (path: string): EventLocation => ({
	file: { path },
	lineNumber: undefined,
});

const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
	title: 'Sample event',
	allDay: false,
	date: '2026-03-02',
	startTime: '09:00',
	endTime: '10:00',
	taskEvent: true,
	...overrides,
});

const createEntry = (
	eventOverrides: Partial<CalendarEvent>,
	path: string,
): EditableEventResponse => [createEvent(eventOverrides), createLocation(path)];

const createSetEventsHarness = (initial: EditableEventResponse[]) => {
	let state = [...initial];
	const setEvents: EventServiceDeps['setEvents'] = (updater) => {
		state = updater(state);
	};
	return {
		setEvents,
		getState: () => state,
	};
};

type CalendarMock = {
	modifyEvent: EventServiceDeps['calendar']['modifyEvent'];
	deleteEvent: EventServiceDeps['calendar']['deleteEvent'];
	createEvent: EventServiceDeps['calendar']['createEvent'];
};

const createDeps = (
	calendar: CalendarMock,
	setEvents: EventServiceDeps['setEvents'],
): {
	deps: EventServiceDeps;
	reloadCount: () => number;
	notices: string[];
} => {
	let reloads = 0;
	const notices: string[] = [];
	const deps: EventServiceDeps = {
		calendar: calendar as EventServiceDeps['calendar'],
		setEvents,
		scheduleReload: () => {
			reloads += 1;
		},
		notice: (message: string) => {
			notices.push(message);
		},
		updateLocation: (previous, next) => {
			setEvents((current) =>
				current.map((entry) => (entry[1] === previous ? [entry[0], next] : entry)),
			);
		},
		beginModification: createEventModificationGuard(),
	};
	return {
		deps,
		reloadCount: () => reloads,
		notices,
	};
};

void test('saveEventEntry updates event and location on success', async () => {
	const previous = createEntry({ title: 'Before' }, 'calendar/before.md');
	const next = createEntry({ title: 'After' }, 'calendar/before.md');
	const updatedLocation = createLocation('calendar/after.md');
	const harness = createSetEventsHarness([previous]);
	const calendar: CalendarMock = {
		modifyEvent: (_location, _event, onUpdateLocation) => {
			onUpdateLocation(updatedLocation);
			return Promise.resolve();
		},
		deleteEvent: () => Promise.resolve(),
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await saveEventEntry(deps, next, previous);

	assert.strictEqual(reloadCount(), 1);
	assert.deepEqual(notices, []);
	assert.strictEqual(harness.getState().length, 1);
	assert.strictEqual(harness.getState()[0]?.[0].title, 'After');
	assert.strictEqual(harness.getState()[0]?.[1].file.path, 'calendar/after.md');
});

void test('saveEventEntry rolls back to previous event on failure', async () => {
	const previous = createEntry({ title: 'Before' }, 'calendar/before.md');
	const next = createEntry({ title: 'After' }, 'calendar/before.md');
	const harness = createSetEventsHarness([previous]);
	const calendar: CalendarMock = {
		modifyEvent: () => Promise.reject(new Error('save failed')),
		deleteEvent: () => Promise.resolve(),
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await saveEventEntry(deps, next, previous);

	assert.strictEqual(reloadCount(), 1);
	assert.deepEqual(notices, ['Failed to save the event.']);
	assert.strictEqual(harness.getState().length, 1);
	assert.strictEqual(harness.getState()[0]?.[0].title, 'Before');
});

void test('saveEventEntry restores the previous event and location after a relocated save fails', async () => {
	const previous = createEntry({ title: 'Before' }, 'calendar/before.md');
	const next = createEntry({ title: 'After' }, 'calendar/before.md');
	const updatedLocation = createLocation('calendar/after.md');
	const harness = createSetEventsHarness([previous]);
	const calendar: CalendarMock = {
		modifyEvent: (_location, _event, onUpdateLocation) => {
			onUpdateLocation(updatedLocation);
			return Promise.reject(new Error('save failed after relocation'));
		},
		deleteEvent: () => Promise.resolve(),
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps, notices } = createDeps(calendar, harness.setEvents);

	await saveEventEntry(deps, next, previous);

	assert.deepEqual(notices, ['Failed to save the event.']);
	assert.strictEqual(harness.getState().length, 1);
	assert.strictEqual(harness.getState()[0]?.[0].title, 'Before');
	assert.strictEqual(harness.getState()[0]?.[1].file.path, 'calendar/before.md');
});

void test('saveEventEntry keeps uncertain state for reload instead of claiming a rollback', async () => {
	const previous = createEntry({ title: 'Before' }, 'calendar/before.md');
	const next = createEntry({ title: 'After' }, 'calendar/before.md');
	const uncertainLocation = createLocation('calendar/after.md');
	const harness = createSetEventsHarness([previous]);
	const calendar: CalendarMock = {
		modifyEvent: (_location, _event, onUpdateLocation) => {
			onUpdateLocation(uncertainLocation);
			return Promise.reject(
				Object.assign(new Error('rollback failed'), { eventStateUncertain: true }),
			);
		},
		deleteEvent: () => Promise.resolve(),
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await saveEventEntry(deps, next, previous);

	assert.strictEqual(reloadCount(), 2);
	assert.deepEqual(notices, ['The event may be partially saved. Reloading the calendar.']);
	assert.strictEqual(harness.getState()[0]?.[0].title, 'After');
	assert.strictEqual(harness.getState()[0]?.[1].file.path, 'calendar/after.md');
});

void test('a late failed save cannot roll back a newer successful event update', async () => {
	const previous = createEntry({ title: 'Before' }, 'calendar/before.md');
	const firstNext = createEntry({ title: 'First' }, 'calendar/before.md');
	const secondNext = createEntry({ title: 'Second' }, 'calendar/before.md');
	const secondLocation = createLocation('calendar/second.md');
	const harness = createSetEventsHarness([previous]);
	let rejectFirst: (error: Error) => void = () => undefined;
	let modificationCount = 0;
	const calendar: CalendarMock = {
		modifyEvent: (_location, _event, onUpdateLocation) => {
			modificationCount += 1;
			if (modificationCount === 1) {
				return new Promise<void>((_resolve, reject) => {
					rejectFirst = reject;
				});
			}
			onUpdateLocation(secondLocation);
			return Promise.resolve();
		},
		deleteEvent: () => Promise.resolve(),
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps, notices } = createDeps(calendar, harness.setEvents);

	const firstSave = saveEventEntry(deps, firstNext, previous);
	await saveEventEntry(deps, secondNext, previous);
	rejectFirst(new Error('first save failed late'));
	await firstSave;

	assert.strictEqual(harness.getState()[0]?.[0].title, 'Second');
	assert.strictEqual(harness.getState()[0]?.[1].file.path, 'calendar/second.md');
	assert.deepEqual(notices, []);
});

void test('createEventEntry passes timeline creator and appends new entry', async () => {
	const harness = createSetEventsHarness([]);
	const rawEvent = createEvent({ title: 'Created event', creator: undefined });
	let createPayload: unknown = null;
	const calendar: CalendarMock = {
		modifyEvent: () => Promise.resolve(),
		deleteEvent: () => Promise.resolve(),
		createEvent: (event: CalendarEvent) => {
			createPayload = event;
			return Promise.resolve(createLocation('calendar/created.md'));
		},
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await createEventEntry(deps, rawEvent, 'timeline');

	assert.strictEqual(reloadCount(), 1);
	assert.deepEqual(notices, []);
	assert.strictEqual((createPayload as { creator?: string } | null)?.creator, 'timeline');
	assert.strictEqual(harness.getState().length, 1);
	assert.strictEqual(harness.getState()[0]?.[0].title, 'Created event');
	assert.strictEqual(harness.getState()[0]?.[0].creator, undefined);
	assert.strictEqual(harness.getState()[0]?.[1].file.path, 'calendar/created.md');
});

void test('deleteEventEntry keeps state and reports notice on failure', async () => {
	const entry = createEntry({ title: 'To keep' }, 'calendar/keep.md');
	const harness = createSetEventsHarness([entry]);
	const calendar: CalendarMock = {
		modifyEvent: () => Promise.resolve(),
		deleteEvent: () => Promise.reject(new Error('delete failed')),
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await deleteEventEntry(deps, entry);

	assert.strictEqual(reloadCount(), 1);
	assert.deepEqual(notices, ['Failed to delete the event.']);
	assert.strictEqual(harness.getState().length, 1);
	assert.strictEqual(harness.getState()[0]?.[0].title, 'To keep');
});

void test('deleteEventEntry removes the resolved location after a queued rename', async () => {
	const requestedEntry = createEntry({ title: 'Delete me' }, 'calendar/before.md');
	const relocatedEntry = createEntry({ title: 'Delete me' }, 'calendar/after.md');
	const harness = createSetEventsHarness([relocatedEntry]);
	const calendar: CalendarMock = {
		modifyEvent: () => Promise.resolve(),
		deleteEvent: () => Promise.resolve(relocatedEntry[1]),
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps, notices } = createDeps(calendar, harness.setEvents);

	await deleteEventEntry(deps, requestedEntry);

	assert.deepEqual(notices, []);
	assert.deepEqual(harness.getState(), []);
});

void test('deleteEventEntry removes matching entry by location value', async () => {
	const entry = createEntry({ title: 'To remove' }, 'calendar/remove.md');
	const storedEntry: EditableEventResponse = [
		entry[0],
		{
			file: { path: entry[1].file.path },
			lineNumber: entry[1].lineNumber,
		},
	];
	const harness = createSetEventsHarness([storedEntry]);
	const calendar: CalendarMock = {
		modifyEvent: () => Promise.resolve(),
		deleteEvent: () => Promise.resolve(),
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await deleteEventEntry(deps, entry);

	assert.strictEqual(reloadCount(), 1);
	assert.deepEqual(notices, []);
	assert.strictEqual(harness.getState().length, 0);
});

void test('deleteEventEntry passes linked note deletion option to calendar', async () => {
	const entry = createEntry({ title: 'To remove with note' }, 'calendar/remove.md');
	const harness = createSetEventsHarness([entry]);
	let deleteLinkedNote: boolean | undefined;
	const calendar: CalendarMock = {
		modifyEvent: () => Promise.resolve(),
		deleteEvent: (_location, options) => {
			deleteLinkedNote = options?.deleteLinkedNote;
			return Promise.resolve();
		},
		createEvent: () => Promise.resolve(createLocation('calendar/new.md')),
	};
	const { deps } = createDeps(calendar, harness.setEvents);

	await deleteEventEntry(deps, entry, { deleteLinkedNote: true });

	assert.strictEqual(deleteLinkedNote, true);
	assert.strictEqual(harness.getState().length, 0);
});
