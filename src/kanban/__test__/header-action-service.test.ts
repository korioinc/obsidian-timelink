/* eslint-disable import/no-nodejs-modules */
import { isVisibilitySettingEnabled } from '../services/header-visibility-utils.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('isVisibilitySettingEnabled uses defaults when settings are undefined', () => {
	assert.equal(isVisibilitySettingEnabled(undefined, 'show-set-view'), true);
	assert.equal(isVisibilitySettingEnabled(undefined, 'show-add-list'), true);
});

void test('isVisibilitySettingEnabled respects false overrides', () => {
	assert.equal(isVisibilitySettingEnabled({ 'show-set-view': false }, 'show-set-view'), false);
	assert.equal(isVisibilitySettingEnabled({ 'show-add-list': false }, 'show-add-list'), false);
});
