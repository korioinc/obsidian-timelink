import { mapWithConcurrency } from '../../utils/map-with-concurrency.ts';
import { assert, test } from 'vitest';

void test('mapWithConcurrency preserves order and caps active work', async () => {
	let active = 0;
	let maxActive = 0;
	const results = await mapWithConcurrency([3, 1, 2, 0], 2, async (value) => {
		active += 1;
		maxActive = Math.max(maxActive, active);
		await Promise.resolve();
		active -= 1;
		return value * 2;
	});

	assert.deepEqual(results, [6, 2, 4, 0]);
	assert.strictEqual(maxActive, 2);
});
