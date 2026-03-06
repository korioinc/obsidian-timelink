/* eslint-disable import/no-nodejs-modules */
import { BOARD_VISIBILITY_SETTINGS } from '../constants.ts';
import { getBoardSettingsOverrides, normalizeBoardSettings } from '../services/settings-service.ts';
import type { KanbanBoardSettings } from '../types.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('normalizeBoardSettings applies visibility defaults from config', () => {
	const normalized = normalizeBoardSettings();

	BOARD_VISIBILITY_SETTINGS.forEach((setting) => {
		assert.equal(normalized[setting.key], setting.defaultValue);
	});
});

void test('board visibility config does not expose deprecated search action', () => {
	const visibilityKeys = BOARD_VISIBILITY_SETTINGS.map((setting) => setting.key as string);
	assert.equal(visibilityKeys.includes('show-search'), false);
});

void test('getBoardSettingsOverrides keeps only non-default visibility values', () => {
	const overridesInput = BOARD_VISIBILITY_SETTINGS.reduce<KanbanBoardSettings>((acc, setting) => {
		acc[setting.key] = setting.defaultValue;
		return acc;
	}, {});
	overridesInput['show-set-view'] = false;
	overridesInput['show-add-list'] = false;

	const normalized = normalizeBoardSettings(overridesInput);
	const overrides = getBoardSettingsOverrides(normalized);

	assert.deepEqual(overrides, {
		'show-set-view': false,
		'show-add-list': false,
	});
});
