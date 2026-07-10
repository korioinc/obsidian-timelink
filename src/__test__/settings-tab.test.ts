import { syncCurrentSettingInput } from '../settings-input-sync.ts';
import { assert, test } from 'vitest';

const createControl = (initialValue: string) => {
	let value = initialValue;
	return {
		getValue: () => value,
		setValue: (nextValue: string) => {
			value = nextValue;
		},
	};
};

void test('the current settings input reflects its normalized or rolled-back value', () => {
	const control = createControl(' A\\B/ ');

	assert.strictEqual(syncCurrentSettingInput(control, ' A\\B/ ', 'A/B'), true);
	assert.strictEqual(control.getValue(), 'A/B');
});

void test('an older settings request cannot overwrite newer input', () => {
	const control = createControl('Newer');

	assert.strictEqual(syncCurrentSettingInput(control, 'Older', 'Persisted'), false);
	assert.strictEqual(control.getValue(), 'Newer');
});
