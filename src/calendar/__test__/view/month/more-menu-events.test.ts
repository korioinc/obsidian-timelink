/* eslint-disable import/no-nodejs-modules */
import type { EventSegment } from '../../../types';
import { buildMoreMenuEvents } from '../../../utils/more-menu-events.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

const createDateKeys = (count: number, startDay = 1): string[] =>
	Array.from(
		{ length: count },
		(_, index) => `2026-03-${String(startDay + index).padStart(2, '0')}`,
	);

const createSegment = (
	id: string,
	startIndex: number,
	endIndex: number,
	dateKeys: string[],
): EventSegment => {
	const start = dateKeys[startIndex] ?? '2026-03-01';
	const end = dateKeys[endIndex] ?? start;
	return {
		id,
		event: {
			title: id,
			allDay: true,
			date: start,
			...(end !== start ? { endDate: end } : {}),
		},
		location: {
			file: { path: `calendar/${id}.md` },
			lineNumber: undefined,
		},
		start,
		end,
		span: endIndex - startIndex + 1,
		startIndex,
		endIndex,
	};
};

void test('buildMoreMenuEvents returns empty when menu is closed', () => {
	const result = buildMoreMenuEvents({
		eventRows: [],
		indexByDateKey: new Map(),
		moreMenu: null,
	});

	assert.deepEqual(result, []);
});

void test('buildMoreMenuEvents returns empty for unknown date key', () => {
	const result = buildMoreMenuEvents({
		eventRows: [],
		indexByDateKey: new Map([['2026-03-01', 0]]),
		moreMenu: { dateKey: '2026-04-01' },
	});

	assert.deepEqual(result, []);
});

void test('buildMoreMenuEvents includes only placements intersecting selected day', () => {
	const dateKeys = createDateKeys(14);
	const indexByDateKey = new Map(dateKeys.map((key, index) => [key, index]));
	const inSingle = createSegment('in-single', 9, 9, dateKeys);
	const inMulti = createSegment('in-multi', 8, 10, dateKeys);
	const outSegment = createSegment('out', 11, 12, dateKeys);

	const events = buildMoreMenuEvents({
		eventRows: [[inSingle, inMulti, outSegment]],
		indexByDateKey,
		moreMenu: { dateKey: dateKeys[9] ?? '' },
	});

	assert.deepEqual(events.map((entry) => entry.segment.id).sort(), ['in-multi', 'in-single']);
});
