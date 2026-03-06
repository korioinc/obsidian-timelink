/* eslint-disable import/no-nodejs-modules */
import {
	compareEventStartTimeThenTitle,
	compareEventTimeMinutesThenTitle,
} from '../../utils/event-order';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('compareEventTimeMinutesThenTitle sorts timed entries before missing time', () => {
	assert.equal(compareEventTimeMinutesThenTitle(540, null, 'A', 'B') < 0, true);
	assert.equal(compareEventTimeMinutesThenTitle(null, 540, 'A', 'B') > 0, true);
});

void test('compareEventTimeMinutesThenTitle falls back to case-insensitive title', () => {
	assert.equal(compareEventTimeMinutesThenTitle(540, 540, 'Alpha', 'beta') < 0, true);
	assert.equal(compareEventTimeMinutesThenTitle(540, 540, 'gamma', 'Beta') > 0, true);
});

void test('compareEventStartTimeThenTitle sorts defined start time before empty values', () => {
	assert.equal(compareEventStartTimeThenTitle('08:00', undefined, 'A', 'B') < 0, true);
	assert.equal(compareEventStartTimeThenTitle(undefined, '08:00', 'A', 'B') > 0, true);
});

void test('compareEventStartTimeThenTitle uses time then title ordering', () => {
	assert.equal(compareEventStartTimeThenTitle('08:00', '09:00', 'Z', 'A') < 0, true);
	assert.equal(compareEventStartTimeThenTitle('09:00', '09:00', 'Zeta', 'alpha') > 0, true);
});
