import {
	extractFrontmatterBody,
	hasFrontmatterKey,
	parseFrontmatterValue,
} from '../../frontmatter/markdown-frontmatter.ts';
import { assert, test } from 'vitest';

void test('extractFrontmatterBody handles LF and CRLF inputs', () => {
	const lfMarkdown = [
		'---',
		'kanban-plugin: board',
		'kanban-color: "#aabbcc"',
		'---',
		'# Title',
	].join('\n');
	const crlfMarkdown = lfMarkdown.replace(/\n/g, '\r\n');
	const expected = 'kanban-plugin: board\nkanban-color: "#aabbcc"';
	assert.strictEqual(extractFrontmatterBody(lfMarkdown), expected);
	assert.strictEqual(extractFrontmatterBody(crlfMarkdown), expected);
	assert.strictEqual(extractFrontmatterBody('# no frontmatter'), undefined);
});

void test('hasFrontmatterKey detects keys with indentation', () => {
	const body = ['title: test', '  kanban-plugin: board'].join('\n');
	assert.strictEqual(hasFrontmatterKey(body, 'kanban-plugin'), true);
	assert.strictEqual(hasFrontmatterKey(body, 'kanban-color'), false);
});

void test('parseFrontmatterValue handles quoted and raw values', () => {
	const body = ['kanban-color: "#abc"', 'event-color: "#00FFAA"', "other-color: '#112233'"].join(
		'\n',
	);
	assert.strictEqual(parseFrontmatterValue(body, 'kanban-color'), '#abc');
	assert.strictEqual(parseFrontmatterValue(body, 'event-color'), '#00FFAA');
	assert.strictEqual(parseFrontmatterValue(body, 'other-color'), '#112233');
	assert.strictEqual(parseFrontmatterValue(body, 'missing'), undefined);
});

void test('parseFrontmatterValue supports case-insensitive mode', () => {
	const body = ['Kanban-Color: "#aBcDeF"'].join('\n');
	assert.strictEqual(parseFrontmatterValue(body, 'kanban-color'), undefined);
	assert.strictEqual(
		parseFrontmatterValue(body, 'kanban-color', { caseInsensitive: true }),
		'#aBcDeF',
	);
});
