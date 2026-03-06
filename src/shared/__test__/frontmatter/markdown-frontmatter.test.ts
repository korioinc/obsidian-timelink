/* eslint-disable import/no-nodejs-modules */
import {
	extractFrontmatterBody,
	hasFrontmatterKey,
	parseFrontmatterValue,
} from '../../frontmatter/markdown-frontmatter.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

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
	assert.equal(extractFrontmatterBody(lfMarkdown), expected);
	assert.equal(extractFrontmatterBody(crlfMarkdown), expected);
	assert.equal(extractFrontmatterBody('# no frontmatter'), undefined);
});

void test('hasFrontmatterKey detects keys with indentation', () => {
	const body = ['title: test', '  kanban-plugin: board'].join('\n');
	assert.equal(hasFrontmatterKey(body, 'kanban-plugin'), true);
	assert.equal(hasFrontmatterKey(body, 'kanban-color'), false);
});

void test('parseFrontmatterValue handles quoted and raw values', () => {
	const body = ['kanban-color: "#abc"', 'event-color: "#00FFAA"', "other-color: '#112233'"].join(
		'\n',
	);
	assert.equal(parseFrontmatterValue(body, 'kanban-color'), '#abc');
	assert.equal(parseFrontmatterValue(body, 'event-color'), '#00FFAA');
	assert.equal(parseFrontmatterValue(body, 'other-color'), '#112233');
	assert.equal(parseFrontmatterValue(body, 'missing'), undefined);
});

void test('parseFrontmatterValue supports case-insensitive mode', () => {
	const body = ['Kanban-Color: "#aBcDeF"'].join('\n');
	assert.equal(parseFrontmatterValue(body, 'kanban-color'), undefined);
	assert.equal(parseFrontmatterValue(body, 'kanban-color', { caseInsensitive: true }), '#aBcDeF');
});
