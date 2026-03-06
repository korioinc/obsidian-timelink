/* eslint-disable import/no-nodejs-modules */
import {
	extractFirstWikiLinkPath,
	extractWikiLinkPath,
	extractWikiLinkSubpath,
	parseWikiLinkParts,
} from '../../utils/wiki-link.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('extractFirstWikiLinkPath parses first wikilink path with alias/subpath', () => {
	assert.equal(extractFirstWikiLinkPath('[[folder/task|Alias]]'), 'folder/task');
	assert.equal(
		extractFirstWikiLinkPath('prefix [[folder/task#section|Alias]] suffix'),
		'folder/task',
	);
});

void test('extractFirstWikiLinkPath returns null when wikilink is missing or invalid', () => {
	assert.equal(extractFirstWikiLinkPath('plain text'), null);
	assert.equal(extractFirstWikiLinkPath('[[|Alias]]'), null);
	assert.equal(extractFirstWikiLinkPath(undefined), null);
});

void test('parseWikiLinkParts parses path, subpath, and alias', () => {
	assert.deepEqual(parseWikiLinkParts('project/note#Heading|Alias'), {
		path: 'project/note',
		subpath: '#Heading',
		alias: 'Alias',
	});
	assert.deepEqual(parseWikiLinkParts('[[project/note#^block|Alias]]'), {
		path: 'project/note',
		subpath: '#^block',
		alias: 'Alias',
	});
});

void test('extractWikiLinkPath and extractWikiLinkSubpath return normalized values', () => {
	assert.equal(extractWikiLinkPath('project/note#Heading|Alias'), 'project/note');
	assert.equal(extractWikiLinkSubpath('project/note#Heading|Alias'), '#Heading');
	assert.equal(extractWikiLinkPath('|Alias'), null);
	assert.equal(extractWikiLinkSubpath('project/note|Alias'), '');
});
