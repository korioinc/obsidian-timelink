/* eslint-disable import/no-nodejs-modules */
import { buildListSections } from '../../../hooks/use-list-sections.ts';
import type { CalendarEvent, EventSegment } from '../../../types';
import assert from 'node:assert/strict';
import test from 'node:test';

const createSegment = (
	id: string,
	eventOverrides: Partial<CalendarEvent>,
	segmentOverrides: Partial<EventSegment> = {},
): EventSegment => {
	const event: CalendarEvent = {
		title: id,
		allDay: false,
		date: '2026-03-01',
		startTime: '09:00',
		endTime: '10:00',
		...eventOverrides,
	};
	const start = event.date ?? '2026-03-01';
	const end = event.endDate ?? start;
	return {
		id,
		event,
		location: { file: { path: `calendar/${id}.md` }, lineNumber: undefined },
		start,
		end,
		span: 1,
		startIndex: 0,
		endIndex: 0,
		...segmentOverrides,
	};
};

void test('buildListSections groups segments by day inclusion range', () => {
	const sections = buildListSections(
		[
			{ date: new Date(2026, 2, 1), key: '2026-03-01' },
			{ date: new Date(2026, 2, 2), key: '2026-03-02' },
		],
		[
			createSegment('single', { date: '2026-03-01' }),
			createSegment(
				'multi',
				{ date: '2026-03-01', endDate: '2026-03-02', allDay: true },
				{ end: '2026-03-02', span: 2 },
			),
		],
	);

	assert.equal(sections[0]?.allDay.length, 1);
	assert.equal(sections[0]?.timed.length, 1);
	assert.equal(sections[1]?.allDay.length, 1);
	assert.equal(sections[1]?.timed.length, 0);
});

void test('buildListSections sorts timed events by start time', () => {
	const sections = buildListSections(
		[{ date: new Date(2026, 2, 1), key: '2026-03-01' }],
		[
			createSegment('late', { startTime: '11:00', endTime: '12:00' }),
			createSegment('early', { startTime: '07:30', endTime: '08:00' }),
		],
	);

	const titles = sections[0]?.timed.map((segment) => segment.event.title);
	assert.deepEqual(titles, ['early', 'late']);
});

void test('buildListSections falls back to date keys when segment indexes are stale', () => {
	const sections = buildListSections(
		[
			{ date: new Date(2026, 2, 1), key: '2026-03-01' },
			{ date: new Date(2026, 2, 2), key: '2026-03-02' },
		],
		[
			createSegment(
				'stale',
				{ date: '2026-03-01', endDate: '2026-03-02', allDay: true },
				{
					start: '2026-03-01',
					end: '2026-03-02',
					startIndex: 0,
					endIndex: 0,
					span: 2,
				},
			),
		],
	);

	assert.equal(sections[0]?.allDay.length, 1);
	assert.equal(sections[1]?.allDay.length, 1);
});
