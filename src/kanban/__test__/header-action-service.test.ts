import { isVisibilitySettingEnabled } from '../services/header-visibility-utils.ts';
import { assert, test } from 'vitest';

void test('isVisibilitySettingEnabled uses defaults when settings are undefined', () => {
	assert.strictEqual(isVisibilitySettingEnabled(undefined, 'show-set-view'), true);
	assert.strictEqual(isVisibilitySettingEnabled(undefined, 'show-add-list'), true);
});

void test('isVisibilitySettingEnabled respects false overrides', () => {
	assert.strictEqual(
		isVisibilitySettingEnabled({ 'show-set-view': false }, 'show-set-view'),
		false,
	);
	assert.strictEqual(
		isVisibilitySettingEnabled({ 'show-add-list': false }, 'show-add-list'),
		false,
	);
});
