/* eslint-disable import/no-nodejs-modules */
import {
	buildLocatedEventEntries,
	buildLocationByEntryId,
} from '../../event/located-event-entries.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('buildLocatedEventEntries appends stable ids while preserving existing id', () => {
	const locationA = { file: { path: 'events/a.md' }, lineNumber: undefined };
	const locationB = { file: { path: 'events/b.md' }, lineNumber: undefined };
	const entries = buildLocatedEventEntries([
		[
			{
				id: 'fixed-id',
				title: 'First',
				allDay: true,
				date: '2026-03-06',
			},
			locationA,
		],
		[
			{
				title: 'Second',
				allDay: true,
				date: '2026-03-06',
			},
			locationB,
		],
	]);

	assert.equal(entries[0]?.id, 'fixed-id');
	assert.equal(entries[0]?.event.id, 'fixed-id');
	assert.equal(entries[1]?.id, 'Second-2026-03-06-1');
	assert.equal(entries[1]?.event.id, 'Second-2026-03-06-1');
	assert.equal(entries[0]?.location, locationA);
	assert.equal(entries[1]?.location, locationB);
});

void test('buildLocationByEntryId returns location map keyed by generated ids', () => {
	const entries = buildLocatedEventEntries([
		[
			{
				title: 'Alpha',
				allDay: true,
				date: '2026-03-07',
			},
			{ file: { path: 'events/alpha.md' }, lineNumber: undefined },
		],
		[
			{
				title: 'Beta',
				allDay: false,
				date: '2026-03-07',
				startTime: '10:00',
				endTime: '11:00',
			},
			{ file: { path: 'events/beta.md' }, lineNumber: undefined },
		],
	]);

	const locationById = buildLocationByEntryId(entries);
	assert.equal(locationById.get(entries[0]!.id)?.file.path, 'events/alpha.md');
	assert.equal(locationById.get(entries[1]!.id)?.file.path, 'events/beta.md');
});
