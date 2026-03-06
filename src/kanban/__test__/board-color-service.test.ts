import {
	readBoardColorFromMarkdown,
	resolveBoardColor,
	updateFrontmatterColor,
} from '../services/color-service.ts';
import { createMockFrontmatterApp } from './helpers/mock-frontmatter-app.ts';
import { assert, test } from 'vitest';

void test('resolveBoardColor prefers metadata color over markdown value', () => {
	const file = { path: 'boards/work.md' };
	const { app } = createMockFrontmatterApp({
		[file.path]: {
			'kanban-color': '#112233',
		},
	});
	const markdown = ['---', 'kanban-color: "#445566"', '---', '', '## Todo'].join('\n');
	assert.strictEqual(resolveBoardColor(app, file, markdown, 'kanban-color'), '#112233');
});

void test('resolveBoardColor falls back to markdown when metadata is missing', () => {
	const file = { path: 'boards/work.md' };
	const { app } = createMockFrontmatterApp({});
	const markdown = ['---', 'kanban-color: "#445566"', '---', '', '## Todo'].join('\n');
	assert.strictEqual(resolveBoardColor(app, file, markdown, 'kanban-color'), '#445566');
});

void test('readBoardColorFromMarkdown parses quoted frontmatter value', () => {
	const markdown = ['---', "kanban-color: '#aBcDeF'", '---', '', '## Todo'].join('\n');
	assert.strictEqual(readBoardColorFromMarkdown(markdown, 'kanban-color'), '#ABCDEF');
});

void test('readBoardColorFromMarkdown supports CRLF and case-insensitive key matching', () => {
	const markdown = ['---', 'Kanban-Color: "#0f0f0f"', '---', '', '## Todo'].join('\r\n');
	assert.strictEqual(readBoardColorFromMarkdown(markdown, 'kanban-color'), '#0F0F0F');
});

void test('updateFrontmatterColor sets and removes key in frontmatter', async () => {
	const file = { path: 'boards/work.md' };
	const { app, frontmatterByPath } = createMockFrontmatterApp();

	await updateFrontmatterColor(app, file, 'kanban-color', '#123456');
	assert.strictEqual(frontmatterByPath[file.path]?.['kanban-color'], '#123456');

	await updateFrontmatterColor(app, file, 'kanban-color', undefined);
	assert.strictEqual(frontmatterByPath[file.path]?.['kanban-color'], undefined);
});
