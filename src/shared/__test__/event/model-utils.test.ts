import {
	assignColumns,
	isTimedEvent,
	resolveEffectiveTimedEventRange,
} from '../../event/model-utils.ts';
import type { CalendarEvent } from '../../event/types.ts';
import { createTimedEventSegment } from '../helpers/event-factories.ts';
import { assert, test } from 'vitest';

const createEvent = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
	title: 'Event',
	allDay: false,
	taskEvent: true,
	date: '2026-06-12',
	startTime: '20:00',
	endTime: '01:01',
	...overrides,
});

void test('resolveEffectiveTimedEventRange infers next day for overnight event without endDate', () => {
	const range = resolveEffectiveTimedEventRange(createEvent({ endDate: undefined }));

	assert.deepEqual(range, {
		startKey: '2026-06-12',
		endKey: '2026-06-13',
		startMinutes: 20 * 60,
		endMinutes: 61,
	});
	assert.strictEqual(isTimedEvent(createEvent({ endDate: undefined })), true);
});

void test('resolveEffectiveTimedEventRange rejects non-timed and ambiguous same-day ranges', () => {
	assert.strictEqual(resolveEffectiveTimedEventRange(createEvent({ allDay: true })), null);
	assert.strictEqual(
		resolveEffectiveTimedEventRange(createEvent({ startTime: '20:00', endTime: '20:00' })),
		null,
	);
	assert.strictEqual(resolveEffectiveTimedEventRange(createEvent({ endDate: '2026-06-12' })), null);
});

void test('assignColumns preserves stable ordering, lowest available columns, and overlap widths', () => {
	const entry = (id: string, startMinutes: number, endMinutes: number) => ({
		segment: createTimedEventSegment(
			{ title: id },
			{
				id,
				location: { file: { path: `calendar/${id}.md` }, lineNumber: undefined },
			},
		),
		dayOffset: 0,
		startMinutes,
		endMinutes,
	});

	const placements = assignColumns([
		entry('D', 40, 80),
		entry('A', 0, 30),
		entry('E', 90, 100),
		entry('B', 0, 120),
		entry('C', 30, 90),
	]);

	assert.deepEqual(
		placements.map(({ segment, column, columnCount }) => ({
			id: segment.id,
			column,
			columnCount,
		})),
		[
			{ id: 'B', column: 0, columnCount: 3 },
			{ id: 'A', column: 1, columnCount: 2 },
			{ id: 'C', column: 1, columnCount: 3 },
			{ id: 'D', column: 2, columnCount: 3 },
			{ id: 'E', column: 1, columnCount: 2 },
		],
	);
});
