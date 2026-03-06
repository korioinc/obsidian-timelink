/* eslint-disable import/no-nodejs-modules */
import { deriveNowIndicatorState } from '../../time-grid/now-indicator.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('deriveNowIndicatorState returns today index visibility and nowTop', () => {
	const dates = [new Date(2026, 2, 1), new Date(2026, 2, 2), new Date(2026, 2, 3)];
	const state = deriveNowIndicatorState({
		dates,
		isToday: (date) => date.getDate() === 2,
		now: new Date(2026, 2, 1, 9, 30),
		slotMinutes: 30,
		slotHeight: 28,
	});

	assert.equal(state.todayIndex, 1);
	assert.equal(state.showNowIndicator, true);
	assert.equal(state.nowTop, 532);
});
