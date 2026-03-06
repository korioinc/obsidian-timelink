import {
	buildCardTitleWithPrimaryLink,
	getFirstWikiLinkPath,
	splitCardTitle,
} from '../utils/card-title.ts';
import { assert, test } from 'vitest';

void test('splitCardTitle splits first line and preserves remaining body', () => {
	const parts = splitCardTitle('[[Task]]\r\nline1\nline2');
	assert.strictEqual(parts.titleLine, '[[Task]]');
	assert.strictEqual(parts.rest, 'line1\nline2');
});

void test('getFirstWikiLinkPath resolves path without alias and heading', () => {
	assert.strictEqual(getFirstWikiLinkPath('[[folder/task|alias]]'), 'folder/task');
	assert.strictEqual(getFirstWikiLinkPath('[[folder/task#section|alias]]'), 'folder/task');
	assert.strictEqual(getFirstWikiLinkPath('plain text'), null);
});

void test('buildCardTitleWithPrimaryLink replaces only title line', () => {
	const next = buildCardTitleWithPrimaryLink('[[new-link]]', 'Old title\n\nbody line');
	assert.strictEqual(next, '[[new-link]]\nbody line');
});
