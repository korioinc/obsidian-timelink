/* eslint-disable import/no-nodejs-modules */
import { deriveSelectionEndIndexForMode, deriveTimedDatesForMode } from '../../../types.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('deriveSelectionEndIndexForMode returns day/week end boundaries', () => {
	assert.equal(deriveSelectionEndIndexForMode('day'), 0);
	assert.equal(deriveSelectionEndIndexForMode('week'), 6);
});

void test('deriveTimedDatesForMode returns single date for day mode', () => {
	const first = new Date(2026, 2, 1);
	const dates = deriveTimedDatesForMode('day', [{ date: first }, { date: new Date(2026, 2, 2) }], {
		date: first,
	});

	assert.equal(dates.length, 1);
	assert.equal(dates[0]?.getTime(), first.getTime());
});

void test('deriveTimedDatesForMode returns all grid dates for week mode', () => {
	const first = new Date(2026, 2, 1);
	const second = new Date(2026, 2, 2);
	const dates = deriveTimedDatesForMode('week', [{ date: first }, { date: second }], {
		date: first,
	});

	assert.equal(dates.length, 2);
	assert.equal(dates[0]?.getTime(), first.getTime());
	assert.equal(dates[1]?.getTime(), second.getTime());
});
