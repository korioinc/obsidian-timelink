/* eslint-disable import/no-nodejs-modules */
import { createTimedEventSegment as createSegment } from '../../../shared/__test__/helpers/event-factories.ts';
import {
	buildTimedDragDropEvent,
	buildTimedResizeEvent,
	deriveTimedDragRange,
	deriveTimedResizeRange,
} from '../../../shared/event/time-grid-interactions.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('deriveTimedResizeRange returns null without active segment', () => {
	assert.equal(deriveTimedResizeRange(null, '2026-03-02', 600), null);
});

void test('buildTimedResizeEvent clamps same-day end time not to precede start time', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '09:00', endTime: '10:00' });
	const nextEvent = buildTimedResizeEvent(segment, '2026-03-05', 8 * 60);

	assert.equal(nextEvent.date, '2026-03-05');
	assert.equal(nextEvent.endDate, undefined);
	assert.equal(nextEvent.startTime, '09:00');
	assert.equal(nextEvent.endTime, '09:00');
});

void test('buildTimedResizeEvent keeps cross-day end date and hover end time', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '22:00', endTime: '23:00' });
	const nextEvent = buildTimedResizeEvent(segment, '2026-03-06', 30);

	assert.equal(nextEvent.date, '2026-03-05');
	assert.equal(nextEvent.endDate, '2026-03-06');
	assert.equal(nextEvent.endTime, '00:30');
});

void test('buildTimedResizeEvent converts 24:00 boundary into next-day 00:00', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '23:00', endTime: '23:30' });
	const nextEvent = buildTimedResizeEvent(segment, '2026-03-05', 24 * 60);

	assert.equal(nextEvent.date, '2026-03-05');
	assert.equal(nextEvent.endDate, '2026-03-06');
	assert.equal(nextEvent.endTime, '00:00');
});

void test('deriveTimedDragRange shifts start and end across days', () => {
	const segment = createSegment(
		{
			date: '2026-03-01',
			endDate: '2026-03-02',
			startTime: '09:00',
			endTime: '10:00',
		},
		{ end: '2026-03-02', span: 2 },
	);

	const range = deriveTimedDragRange(segment, '2026-03-03', 11 * 60);
	assert.ok(range);
	assert.equal(range.startDateKey, '2026-03-03');
	assert.equal(range.endDateKey, '2026-03-04');
	assert.equal(range.startMinutes, 11 * 60);
	assert.equal(range.endMinutes, 12 * 60);
});

void test('buildTimedDragDropEvent updates date/time and preserves event fields', () => {
	const segment = createSegment({ date: '2026-03-01', startTime: '09:00', endTime: '10:00' });
	const beforeTitle = segment.event.title;
	const beforeDate = segment.event.date;

	const updated = buildTimedDragDropEvent(segment, '2026-03-02', 10 * 60);

	assert.equal(updated.title, beforeTitle);
	assert.equal(updated.allDay, false);
	assert.equal(updated.date, '2026-03-02');
	assert.equal(updated.endDate, '2026-03-02');
	assert.equal(updated.startTime, '10:00');
	assert.equal(updated.endTime, '11:00');
	assert.equal(segment.event.date, beforeDate);
});

void test('buildTimedDragDropEvent rolls 24:00 start over to next-day 00:00', () => {
	const segment = createSegment({ date: '2026-03-01', startTime: '09:00', endTime: '10:00' });
	const updated = buildTimedDragDropEvent(segment, '2026-03-02', 24 * 60);

	assert.equal(updated.date, '2026-03-03');
	assert.equal(updated.startTime, '00:00');
	assert.equal(updated.endDate, '2026-03-03');
	assert.equal(updated.endTime, '01:00');
});
