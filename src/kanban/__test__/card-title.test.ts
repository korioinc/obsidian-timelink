/* eslint-disable import/no-nodejs-modules */
import {
	buildCardTitleWithPrimaryLink,
	getFirstWikiLinkPath,
	splitCardTitle,
} from '../utils/card-title.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('splitCardTitle splits first line and preserves remaining body', () => {
	const parts = splitCardTitle('[[Task]]\r\nline1\nline2');
	assert.equal(parts.titleLine, '[[Task]]');
	assert.equal(parts.rest, 'line1\nline2');
});

void test('getFirstWikiLinkPath resolves path without alias and heading', () => {
	assert.equal(getFirstWikiLinkPath('[[folder/task|alias]]'), 'folder/task');
	assert.equal(getFirstWikiLinkPath('[[folder/task#section|alias]]'), 'folder/task');
	assert.equal(getFirstWikiLinkPath('plain text'), null);
});

void test('buildCardTitleWithPrimaryLink replaces only title line', () => {
	const next = buildCardTitleWithPrimaryLink('[[new-link]]', 'Old title\n\nbody line');
	assert.equal(next, '[[new-link]]\nbody line');
});
