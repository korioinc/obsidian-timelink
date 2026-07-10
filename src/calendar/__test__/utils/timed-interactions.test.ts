import { createTimedEventSegment as createSegment } from '../../../shared/__test__/helpers/event-factories.ts';
import {
	buildTimedDragDropEvent,
	buildTimedResizeEvent,
	deriveTimedDragRange,
	deriveTimedResizeRange,
	resolveTimedDragHoverState,
} from '../../../shared/event/time-grid-interactions.ts';
import { assert, test } from 'vitest';

void test('deriveTimedResizeRange returns null without active segment', () => {
	assert.strictEqual(deriveTimedResizeRange(null, '2026-03-02', 600), null);
});

void test('buildTimedResizeEvent keeps one slot when same-day resize reaches the start', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '09:00', endTime: '10:00' });
	const nextEvent = buildTimedResizeEvent(segment, '2026-03-05', 8 * 60);

	assert.strictEqual(nextEvent.date, '2026-03-05');
	assert.strictEqual(nextEvent.endDate, undefined);
	assert.strictEqual(nextEvent.startTime, '09:00');
	assert.strictEqual(nextEvent.endTime, '09:30');
});

void test('deriveTimedResizeRange keeps one visible slot at the event start', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '09:00', endTime: '10:00' });
	const range = deriveTimedResizeRange(segment, '2026-03-05', 9 * 60);

	assert.ok(range);
	assert.strictEqual(range.startDateKey, '2026-03-05');
	assert.strictEqual(range.endDateKey, '2026-03-05');
	assert.strictEqual(range.startMinutes, 9 * 60);
	assert.strictEqual(range.endMinutes, 9 * 60 + 30);
});

void test('deriveTimedResizeRange preserves an existing positive duration below the resize step', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '09:00', endTime: '09:10' });
	const range = deriveTimedResizeRange(segment, '2026-03-05', 9 * 60 + 10, 30);

	assert.ok(range);
	assert.strictEqual(range.endMinutes, 9 * 60 + 10);
});

void test('deriveTimedResizeRange keeps a positive snapped boundary instead of adding an unsnapped step', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '09:10', endTime: '10:00' });
	const range = deriveTimedResizeRange(segment, '2026-03-05', 9 * 60 + 30, 30);

	assert.ok(range);
	assert.strictEqual(range.endMinutes, 9 * 60 + 30);
});

void test('buildTimedResizeEvent keeps cross-day end date and hover end time', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '22:00', endTime: '23:00' });
	const nextEvent = buildTimedResizeEvent(segment, '2026-03-06', 30);

	assert.strictEqual(nextEvent.date, '2026-03-05');
	assert.strictEqual(nextEvent.endDate, '2026-03-06');
	assert.strictEqual(nextEvent.endTime, '00:30');
});

void test('buildTimedResizeEvent converts 24:00 boundary into next-day 00:00', () => {
	const segment = createSegment({ date: '2026-03-05', startTime: '23:00', endTime: '23:30' });
	const nextEvent = buildTimedResizeEvent(segment, '2026-03-05', 24 * 60);

	assert.strictEqual(nextEvent.date, '2026-03-05');
	assert.strictEqual(nextEvent.endDate, '2026-03-06');
	assert.strictEqual(nextEvent.endTime, '00:00');
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
	assert.strictEqual(range.startDateKey, '2026-03-03');
	assert.strictEqual(range.endDateKey, '2026-03-04');
	assert.strictEqual(range.startMinutes, 11 * 60);
	assert.strictEqual(range.endMinutes, 12 * 60);
});

void test('deriveTimedDragRange preserves inferred overnight duration without endDate', () => {
	const segment = createSegment(
		{
			date: '2026-06-12',
			startTime: '20:00',
			endTime: '01:01',
		},
		{ start: '2026-06-12', end: '2026-06-12' },
	);

	const range = deriveTimedDragRange(segment, '2026-06-15', 20 * 60);

	assert.ok(range);
	assert.strictEqual(range.startDateKey, '2026-06-15');
	assert.strictEqual(range.startMinutes, 20 * 60);
	assert.strictEqual(range.endDateKey, '2026-06-16');
	assert.strictEqual(range.endMinutes, 61);
});

void test('buildTimedDragDropEvent updates date/time and preserves event fields', () => {
	const segment = createSegment({ date: '2026-03-01', startTime: '09:00', endTime: '10:00' });
	const beforeTitle = segment.event.title;
	const beforeDate = segment.event.date;

	const updated = buildTimedDragDropEvent(segment, '2026-03-02', 10 * 60);

	assert.strictEqual(updated.title, beforeTitle);
	assert.strictEqual(updated.allDay, false);
	assert.strictEqual(updated.date, '2026-03-02');
	assert.strictEqual(updated.endDate, '2026-03-02');
	assert.strictEqual(updated.startTime, '10:00');
	assert.strictEqual(updated.endTime, '11:00');
	assert.strictEqual(segment.event.date, beforeDate);
});

void test('buildTimedDragDropEvent preserves inferred overnight duration without endDate', () => {
	const segment = createSegment(
		{
			date: '2026-06-12',
			startTime: '20:00',
			endTime: '01:01',
		},
		{ start: '2026-06-12', end: '2026-06-12' },
	);

	const updated = buildTimedDragDropEvent(segment, '2026-06-15', 20 * 60);

	assert.strictEqual(updated.date, '2026-06-15');
	assert.strictEqual(updated.startTime, '20:00');
	assert.strictEqual(updated.endDate, '2026-06-16');
	assert.strictEqual(updated.endTime, '01:01');
});

void test('buildTimedDragDropEvent rolls 24:00 start over to next-day 00:00', () => {
	const segment = createSegment({ date: '2026-03-01', startTime: '09:00', endTime: '10:00' });
	const updated = buildTimedDragDropEvent(segment, '2026-03-02', 24 * 60);

	assert.strictEqual(updated.date, '2026-03-03');
	assert.strictEqual(updated.startTime, '00:00');
	assert.strictEqual(updated.endDate, '2026-03-03');
	assert.strictEqual(updated.endTime, '01:00');
});

void test('resolveTimedDragHoverState preserves actual start when dragging a continuation slice', () => {
	const segment = createSegment(
		{
			date: '2026-03-08',
			endDate: '2026-03-09',
			startTime: '23:30',
			endTime: '02:10',
		},
		{ start: '2026-03-09', end: '2026-03-09', span: 1 },
	);

	const startHover = resolveTimedDragHoverState(segment, '2026-03-09', 0, {
		dateKey: '2026-03-09',
		startMinutes: 0,
	});
	assert.deepEqual(startHover, {
		dateKey: '2026-03-08',
		minutes: 23 * 60 + 30,
	});

	const movedHover = resolveTimedDragHoverState(segment, '2026-03-10', 0, {
		dateKey: '2026-03-09',
		startMinutes: 0,
	});
	const updated = buildTimedDragDropEvent(segment, movedHover.dateKey, movedHover.minutes);

	assert.strictEqual(updated.date, '2026-03-09');
	assert.strictEqual(updated.startTime, '23:30');
	assert.strictEqual(updated.endDate, '2026-03-10');
	assert.strictEqual(updated.endTime, '02:10');
});
