import {
	extractFirstWikiLinkPath,
	extractWikiLinkPath,
	extractWikiLinkSubpath,
	parseWikiLinkParts,
} from '../../utils/wiki-link.ts';
import { assert, test } from 'vitest';

void test('extractFirstWikiLinkPath parses first wikilink path with alias/subpath', () => {
	assert.strictEqual(extractFirstWikiLinkPath('[[folder/task|Alias]]'), 'folder/task');
	assert.strictEqual(
		extractFirstWikiLinkPath('prefix [[folder/task#section|Alias]] suffix'),
		'folder/task',
	);
});

void test('extractFirstWikiLinkPath returns null when wikilink is missing or invalid', () => {
	assert.strictEqual(extractFirstWikiLinkPath('plain text'), null);
	assert.strictEqual(extractFirstWikiLinkPath('[[|Alias]]'), null);
	assert.strictEqual(extractFirstWikiLinkPath(undefined), null);
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
	assert.strictEqual(extractWikiLinkPath('project/note#Heading|Alias'), 'project/note');
	assert.strictEqual(extractWikiLinkSubpath('project/note#Heading|Alias'), '#Heading');
	assert.strictEqual(extractWikiLinkPath('|Alias'), null);
	assert.strictEqual(extractWikiLinkSubpath('project/note|Alias'), '');
});
