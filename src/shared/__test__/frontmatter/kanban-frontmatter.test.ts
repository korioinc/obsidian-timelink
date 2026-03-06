import {
	hasKanbanBoardFrontmatter,
	readKanbanBoardColorFromFrontmatter,
	readKanbanBoardColorFromMarkdown,
	scanKanbanBoardFrontmatter,
} from '../../frontmatter/kanban-frontmatter.ts';
import { assert, test } from 'vitest';

void test('hasKanbanBoardFrontmatter detects canonical board value in frontmatter body', () => {
	const frontmatterBody = ['title: Demo board', 'kanban-plugin: board'].join('\n');
	assert.strictEqual(hasKanbanBoardFrontmatter(frontmatterBody), true);
});

void test('hasKanbanBoardFrontmatter rejects non-board values in frontmatter body', () => {
	const frontmatterBody = ['title: Demo board', 'kanban-plugin: true'].join('\n');
	assert.strictEqual(hasKanbanBoardFrontmatter(frontmatterBody), false);
});

void test('readKanbanBoardColorFromFrontmatter normalizes board color', () => {
	const frontmatterBody = ['kanban-color: "#aBcDeF"'].join('\n');
	assert.strictEqual(readKanbanBoardColorFromFrontmatter(frontmatterBody), '#ABCDEF');
});

void test('scanKanbanBoardFrontmatter reads kanban flag and color from markdown', () => {
	const markdown = ['---', 'kanban-plugin: board', 'KANBAN-COLOR: "#abc"', '---', 'Body'].join(
		'\n',
	);
	assert.deepEqual(scanKanbanBoardFrontmatter(markdown), {
		hasKanban: true,
		kanbanColor: '#AABBCC',
	});
});

void test('scanKanbanBoardFrontmatter rejects non-board values in markdown', () => {
	const markdown = ['---', 'kanban-plugin: false', 'KANBAN-COLOR: "#abc"', '---', 'Body'].join(
		'\n',
	);
	assert.deepEqual(scanKanbanBoardFrontmatter(markdown), {
		hasKanban: false,
		kanbanColor: '#AABBCC',
	});
});

void test('readKanbanBoardColorFromMarkdown returns undefined when frontmatter is missing', () => {
	assert.strictEqual(readKanbanBoardColorFromMarkdown('No frontmatter'), undefined);
});
