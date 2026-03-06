/* eslint-disable import/no-nodejs-modules */
import {
	createAllDayCellLayerStyle,
	createAllDayGridColumnsStyle,
} from '../../../_components/day-week/AllDayEventGrid.tsx';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('createAllDayGridColumnsStyle normalizes column count to at least one', () => {
	assert.deepEqual(createAllDayGridColumnsStyle(7), {
		gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
	});
	assert.deepEqual(createAllDayGridColumnsStyle(0), {
		gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
	});
});

void test('createAllDayCellLayerStyle spans full grid width for all-day cell layer', () => {
	assert.deepEqual(createAllDayCellLayerStyle(7), {
		gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
		gridColumn: '1 / -1',
	});
});
