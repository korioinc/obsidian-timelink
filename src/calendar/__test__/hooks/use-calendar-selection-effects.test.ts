/* eslint-disable import/no-nodejs-modules */
import { EMPTY_TIME_SELECTION } from '../../../shared/hooks/use-time-grid-selection.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('EMPTY_TIME_SELECTION has neutral default values', () => {
	assert.deepEqual(EMPTY_TIME_SELECTION, {
		isSelecting: false,
		anchorDateKey: null,
		anchorMinutes: null,
		hoverDateKey: null,
		hoverMinutes: null,
	});
});
