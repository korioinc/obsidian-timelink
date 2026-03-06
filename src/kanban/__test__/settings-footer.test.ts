/* eslint-disable import/no-nodejs-modules */
import {
	extractSettingsFooterJson,
	stripSettingsFooterFromLines,
} from '../utils/settings-footer.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('extractSettingsFooterJson returns settings JSON text from footer block', () => {
	const markdown = [
		'---',
		'kanban-plugin: board',
		'---',
		'',
		'## Todo',
		'- [ ] Sample',
		'',
		'%% kanban:settings',
		'```',
		'{"show-add-list":false}',
		'```',
		'%%',
	].join('\n');

	assert.equal(extractSettingsFooterJson(markdown), '{"show-add-list":false}');
});

void test('stripSettingsFooterFromLines removes trailing settings footer block', () => {
	const lines = [
		'## Todo',
		'- [ ] One',
		'',
		'%% kanban:settings',
		'```',
		'{"show-add-list":false}',
		'```',
		'%%',
	];

	assert.deepEqual(stripSettingsFooterFromLines(lines), ['## Todo', '- [ ] One', '']);
});

void test('settings footer helpers ignore malformed footer structures', () => {
	const markdown = [
		'## Todo',
		'- [ ] One',
		'',
		'%% kanban:settings',
		'```',
		'{invalid}',
		'%%',
	].join('\n');

	assert.equal(extractSettingsFooterJson(markdown), null);
	assert.deepEqual(stripSettingsFooterFromLines(markdown.split('\n')), markdown.split('\n'));
});
