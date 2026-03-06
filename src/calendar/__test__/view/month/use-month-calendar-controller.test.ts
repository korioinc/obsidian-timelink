import { orderMoreMenuPlacements } from '../../../utils/more-menu-order.ts';
import { assert, test } from 'vitest';

type Placement = {
	id: string;
	weekRow: number;
	columnStart: number;
	spanInWeek: number;
	segment: {
		event: {
			startTime?: string;
			title?: string;
		};
	};
};

void test('orderMoreMenuPlacements sorts by week row, column, span, time, and title', () => {
	const placements: Placement[] = [
		{
			id: 'c',
			weekRow: 1,
			columnStart: 3,
			spanInWeek: 1,
			segment: { event: { startTime: '11:00', title: 'Charlie' } },
		},
		{
			id: 'a',
			weekRow: 0,
			columnStart: 2,
			spanInWeek: 2,
			segment: { event: { startTime: '09:00', title: 'Alpha' } },
		},
		{
			id: 'b',
			weekRow: 0,
			columnStart: 2,
			spanInWeek: 1,
			segment: { event: { startTime: '08:00', title: 'Bravo' } },
		},
	];

	const sorted = orderMoreMenuPlacements(placements);
	assert.deepEqual(
		sorted.map((placement) => placement.id),
		['a', 'b', 'c'],
	);
});
