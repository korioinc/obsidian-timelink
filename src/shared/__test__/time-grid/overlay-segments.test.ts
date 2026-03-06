/* eslint-disable import/no-nodejs-modules */
import {
	buildBoundedRangeSegments,
	buildSingleColumnSegments,
} from '../../time-grid/overlay-segments.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('buildSingleColumnSegments returns empty when range start is different date', () => {
	const segments = buildSingleColumnSegments('2026-03-02', {
		startDateKey: '2026-03-01',
		endDateKey: '2026-03-01',
		startMinutes: 120,
		endMinutes: 180,
	});

	assert.deepEqual(segments, []);
});

void test('buildSingleColumnSegments clamps cross-day range end to full day', () => {
	const segments = buildSingleColumnSegments('2026-03-01', {
		startDateKey: '2026-03-01',
		endDateKey: '2026-03-02',
		startMinutes: 120,
		endMinutes: 180,
	});

	assert.deepEqual(segments, [
		{
			columnIndex: 0,
			startMinutes: 120,
			endMinutes: 24 * 60,
		},
	]);
});

void test('buildBoundedRangeSegments expands minutes across each bounded column', () => {
	const segments = buildBoundedRangeSegments(
		{ startIndex: 2, endIndex: 4 },
		{
			startDateKey: '2026-03-01',
			endDateKey: '2026-03-03',
			startMinutes: 90,
			endMinutes: 210,
		},
	);

	assert.deepEqual(segments, [
		{ columnIndex: 2, startMinutes: 90, endMinutes: 24 * 60 },
		{ columnIndex: 3, startMinutes: 0, endMinutes: 24 * 60 },
		{ columnIndex: 4, startMinutes: 0, endMinutes: 210 },
	]);
});
