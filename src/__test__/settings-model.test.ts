import {
	DEFAULT_SETTINGS,
	normalizeCalendarFolderPath,
	normalizeTimeLinkSettings,
} from '../settings-model.ts';
import { assert, test } from 'vitest';

void test('normalizeTimeLinkSettings validates persisted values and drops stale fields', () => {
	assert.deepEqual(normalizeTimeLinkSettings(null), DEFAULT_SETTINGS);
	assert.deepEqual(
		normalizeTimeLinkSettings({
			enableKanban: false,
			calendarFolderPath: ' Projects\\Current//Events/ ',
			legacySetting: true,
		}),
		{
			enableKanban: false,
			calendarFolderPath: 'Projects/Current/Events',
		},
	);
	assert.deepEqual(
		normalizeTimeLinkSettings({ enableKanban: 'yes', calendarFolderPath: [] }),
		DEFAULT_SETTINGS,
	);
});

void test('normalizeCalendarFolderPath keeps the configured folder inside the vault', () => {
	assert.strictEqual(normalizeCalendarFolderPath('Projects/Archive/../Events'), 'Projects/Events');
	assert.strictEqual(normalizeCalendarFolderPath(' / '), DEFAULT_SETTINGS.calendarFolderPath);
});
