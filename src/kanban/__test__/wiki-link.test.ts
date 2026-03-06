import {
	extractWikiLinkPath,
	extractWikiLinkSubpath,
	parseWikiLinkParts,
} from '../../shared/utils/wiki-link.ts';
import { assert, test } from 'vitest';

void test('parseWikiLinkParts parses path, subpath, and alias', () => {
	assert.deepEqual(parseWikiLinkParts('project/note#Heading|Alias'), {
		path: 'project/note',
		subpath: '#Heading',
		alias: 'Alias',
	});
});

void test('parseWikiLinkParts supports wrapped wikilink text', () => {
	assert.deepEqual(parseWikiLinkParts('[[project/note#^block|Alias]]'), {
		path: 'project/note',
		subpath: '#^block',
		alias: 'Alias',
	});
});

void test('extractWikiLinkPath returns null for empty/invalid input', () => {
	assert.strictEqual(extractWikiLinkPath(''), null);
	assert.strictEqual(extractWikiLinkPath('   '), null);
	assert.strictEqual(extractWikiLinkPath('|alias'), null);
});

void test('extractWikiLinkSubpath returns empty string when no subpath exists', () => {
	assert.strictEqual(extractWikiLinkSubpath('project/note'), '');
	assert.strictEqual(extractWikiLinkSubpath('project/note|Alias'), '');
});
