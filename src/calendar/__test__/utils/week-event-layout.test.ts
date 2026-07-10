import {
	createAllDayEventSegment,
	createTimedEventSegment,
} from '../../../shared/__test__/helpers/event-factories.ts';
import { getWeekEventLayout } from '../../utils/week-event-layout.ts';
import { assert, test } from 'vitest';

const dateKey = (day: number): string => `2026-03-${String(day).padStart(2, '0')}`;

const segment = (id: string, startIndex: number, endIndex: number) =>
	createAllDayEventSegment(
		{
			id,
			title: id,
			date: dateKey(startIndex + 1),
			...(endIndex === startIndex ? {} : { endDate: dateKey(endIndex + 1) }),
		},
		{
			id,
			start: dateKey(startIndex + 1),
			end: dateKey(endIndex + 1),
			span: endIndex - startIndex + 1,
			startIndex,
			endIndex,
		},
	);

const timedSegment = (id: string, startTime: string) =>
	createTimedEventSegment(
		{
			id,
			title: id,
			date: dateKey(1),
			startTime,
			endTime: '10:00',
		},
		{
			id,
			start: dateKey(1),
			end: dateKey(1),
			span: 1,
			startIndex: 0,
			endIndex: 0,
		},
	);

void test('getWeekEventLayout preserves first-available row placement as intervals expire', () => {
	const layout = getWeekEventLayout(
		[
			[
				segment('D', 1, 1),
				segment('B', 0, 0),
				segment('F', 4, 4),
				segment('C', 0, 2),
				segment('A', 0, 3),
				segment('E', 3, 3),
			],
		],
		0,
		6,
		10,
	);
	const rowsById = [...layout.multiDayPlacements, ...layout.singleDayPlacements]
		.map((placement) => [placement.segment.id, placement.weekRow] as const)
		.sort(([left], [right]) => left.localeCompare(right));

	assert.strictEqual(layout.weekRowCount, 3);
	assert.deepEqual(rowsById, [
		['A', 0],
		['B', 2],
		['C', 1],
		['D', 2],
		['E', 1],
		['F', 0],
	]);
});

void test('getWeekEventLayout treats out-of-range start times as unscheduled for ordering', () => {
	const layout = getWeekEventLayout(
		[[timedSegment('invalid', '-1:00'), timedSegment('valid', '09:00')]],
		0,
		6,
		10,
	);
	const rowsById = layout.singleDayPlacements
		.map((placement) => [placement.segment.id, placement.weekRow] as const)
		.sort(([left], [right]) => left.localeCompare(right));

	assert.deepEqual(rowsById, [
		['invalid', 1],
		['valid', 0],
	]);
});
