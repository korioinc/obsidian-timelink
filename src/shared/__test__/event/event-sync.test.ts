import {
	applyOptimisticMove,
	rollbackOptimisticMove,
	updateEventEntry,
	updateEventLocation,
} from '../../event/event-sync.ts';
import type { EditableEventResponse } from '../../event/types.ts';
import { assert, test } from 'vitest';

const createEntry = (title: string, path: string, lineNumber?: number): EditableEventResponse => [
	{
		title,
		allDay: false,
		taskEvent: true,
		date: '2026-03-02',
	},
	{
		file: { path },
		lineNumber,
	},
];

void test('updateEventLocation matches equivalent locations even when object references differ', () => {
	const entry = createEntry('A', 'calendar/a.md');
	const events: EditableEventResponse[] = [entry];
	const previous = { file: { path: 'calendar/a.md' }, lineNumber: undefined };
	const next = { file: { path: 'calendar/b.md' }, lineNumber: undefined };
	const updated = updateEventLocation(events, previous, next);
	assert.strictEqual(updated[0]?.[1].file.path, 'calendar/b.md');
});

void test('updateEventEntry matches equivalent locations by value', () => {
	const entry = createEntry('Before', 'calendar/a.md');
	const events: EditableEventResponse[] = [entry];
	const previous = { file: { path: 'calendar/a.md' }, lineNumber: undefined };
	const next = { file: { path: 'calendar/b.md' }, lineNumber: undefined };
	const updatedEvent = { ...entry[0], title: 'After' };
	const updated = updateEventEntry(events, previous, next, updatedEvent);
	assert.strictEqual(updated[0]?.[0].title, 'After');
	assert.strictEqual(updated[0]?.[1].file.path, 'calendar/b.md');
});

void test('rollbackOptimisticMove restores original event with equivalent location values', () => {
	const previous = createEntry('Before', 'calendar/original.md');
	const moved = applyOptimisticMove([previous], previous, { ...previous[0], title: 'Moved' });
	const restored = rollbackOptimisticMove(moved, previous, {
		file: { path: 'calendar/original.md' },
		lineNumber: undefined,
	});
	assert.strictEqual(restored[0]?.[0].title, 'Before');
	assert.strictEqual(restored[0]?.[1].file.path, 'calendar/original.md');
});
