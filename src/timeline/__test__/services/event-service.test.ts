/* eslint-disable import/no-nodejs-modules */
import {
	createEventEntry,
	deleteEventEntry,
	saveEventEntry,
	type EventServiceDeps,
} from '../../../shared/event/event-service.ts';
import type {
	EditableEventResponse,
	EventLocation,
	CalendarEvent,
} from '../../../shared/event/types';
import assert from 'node:assert/strict';
import test from 'node:test';

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
		modifyEvent: async (_location, _event, onUpdateLocation) => {
			onUpdateLocation(updatedLocation);
		},
		deleteEvent: async () => {},
		createEvent: async () => createLocation('calendar/new.md'),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await saveEventEntry(deps, next, previous);

	assert.equal(reloadCount(), 1);
	assert.deepEqual(notices, []);
	assert.equal(harness.getState().length, 1);
	assert.equal(harness.getState()[0]?.[0].title, 'After');
	assert.equal(harness.getState()[0]?.[1].file.path, 'calendar/after.md');
});

void test('saveEventEntry rolls back to previous event on failure', async () => {
	const previous = createEntry({ title: 'Before' }, 'calendar/before.md');
	const next = createEntry({ title: 'After' }, 'calendar/before.md');
	const harness = createSetEventsHarness([previous]);
	const calendar: CalendarMock = {
		modifyEvent: async () => {
			throw new Error('save failed');
		},
		deleteEvent: async () => {},
		createEvent: async () => createLocation('calendar/new.md'),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await saveEventEntry(deps, next, previous);

	assert.equal(reloadCount(), 1);
	assert.deepEqual(notices, ['Failed to save the event.']);
	assert.equal(harness.getState().length, 1);
	assert.equal(harness.getState()[0]?.[0].title, 'Before');
});

void test('createEventEntry passes timeline creator and appends new entry', async () => {
	const harness = createSetEventsHarness([]);
	const rawEvent = createEvent({ title: 'Created event', creator: undefined });
	let createPayload: unknown = null;
	const calendar: CalendarMock = {
		modifyEvent: async () => {},
		deleteEvent: async () => {},
		createEvent: async (event: CalendarEvent) => {
			createPayload = event;
			return createLocation('calendar/created.md');
		},
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await createEventEntry(deps, rawEvent, 'timeline');

	assert.equal(reloadCount(), 1);
	assert.deepEqual(notices, []);
	assert.equal((createPayload as { creator?: string } | null)?.creator, 'timeline');
	assert.equal(harness.getState().length, 1);
	assert.equal(harness.getState()[0]?.[0].title, 'Created event');
	assert.equal(harness.getState()[0]?.[0].creator, undefined);
	assert.equal(harness.getState()[0]?.[1].file.path, 'calendar/created.md');
});

void test('deleteEventEntry keeps state and reports notice on failure', async () => {
	const entry = createEntry({ title: 'To keep' }, 'calendar/keep.md');
	const harness = createSetEventsHarness([entry]);
	const calendar: CalendarMock = {
		modifyEvent: async () => {},
		deleteEvent: async () => {
			throw new Error('delete failed');
		},
		createEvent: async () => createLocation('calendar/new.md'),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await deleteEventEntry(deps, entry);

	assert.equal(reloadCount(), 1);
	assert.deepEqual(notices, ['Failed to delete the event.']);
	assert.equal(harness.getState().length, 1);
	assert.equal(harness.getState()[0]?.[0].title, 'To keep');
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
		modifyEvent: async () => {},
		deleteEvent: async () => {},
		createEvent: async () => createLocation('calendar/new.md'),
	};
	const { deps, reloadCount, notices } = createDeps(calendar, harness.setEvents);

	await deleteEventEntry(deps, entry);

	assert.equal(reloadCount(), 1);
	assert.deepEqual(notices, []);
	assert.equal(harness.getState().length, 0);
});
