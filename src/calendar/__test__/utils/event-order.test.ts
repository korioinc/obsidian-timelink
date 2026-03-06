import {
	compareEventStartTimeThenTitle,
	compareEventTimeMinutesThenTitle,
} from '../../utils/event-order';
import { assert, test } from 'vitest';

void test('compareEventTimeMinutesThenTitle sorts timed entries before missing time', () => {
	assert.strictEqual(compareEventTimeMinutesThenTitle(540, null, 'A', 'B') < 0, true);
	assert.strictEqual(compareEventTimeMinutesThenTitle(null, 540, 'A', 'B') > 0, true);
});

void test('compareEventTimeMinutesThenTitle falls back to case-insensitive title', () => {
	assert.strictEqual(compareEventTimeMinutesThenTitle(540, 540, 'Alpha', 'beta') < 0, true);
	assert.strictEqual(compareEventTimeMinutesThenTitle(540, 540, 'gamma', 'Beta') > 0, true);
});

void test('compareEventStartTimeThenTitle sorts defined start time before empty values', () => {
	assert.strictEqual(compareEventStartTimeThenTitle('08:00', undefined, 'A', 'B') < 0, true);
	assert.strictEqual(compareEventStartTimeThenTitle(undefined, '08:00', 'A', 'B') > 0, true);
});

void test('compareEventStartTimeThenTitle uses time then title ordering', () => {
	assert.strictEqual(compareEventStartTimeThenTitle('08:00', '09:00', 'Z', 'A') < 0, true);
	assert.strictEqual(compareEventStartTimeThenTitle('09:00', '09:00', 'Zeta', 'alpha') > 0, true);
});
