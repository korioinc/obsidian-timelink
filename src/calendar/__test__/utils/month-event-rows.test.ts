import type { CalendarEvent } from '../../../shared/event/types.ts';
import type { DayCellData } from '../../utils/date-grid.ts';
import { buildEventRows } from '../../utils/month-event-rows.ts';
import { assert, test } from 'vitest';

const dateKey = (day: number): string => `2026-03-${String(day).padStart(2, '0')}`;

const event = (id: string, startIndex: number, endIndex: number): CalendarEvent => ({
	id,
	title: id,
	allDay: true,
	date: dateKey(startIndex + 1),
	...(endIndex === startIndex ? {} : { endDate: dateKey(endIndex + 1) }),
});

void test('buildEventRows preserves first-available row placement as intervals expire', () => {
	const grid: DayCellData[] = Array.from({ length: 7 }, (_, index) => ({
		date: new Date(2026, 2, index + 1),
		inMonth: true,
	}));
	const rows = buildEventRows(
		[
			event('D', 1, 1),
			event('B', 0, 0),
			event('F', 4, 4),
			event('C', 0, 2),
			event('A', 0, 3),
			event('E', 3, 3),
		],
		grid,
	);

	assert.deepEqual(
		rows.map((row) => row.map((segment) => segment.event.id)),
		[
			['A', 'F'],
			['C', 'E'],
			['B', 'D'],
		],
	);
});
