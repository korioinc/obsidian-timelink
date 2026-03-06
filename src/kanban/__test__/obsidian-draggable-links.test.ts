/* eslint-disable import/no-nodejs-modules, obsidianmd/no-tfile-tfolder-cast */
import {
	draggableToLinks,
	getObsidianDraggable,
	type ObsidianDraggable,
} from '../utils/obsidian-drag-links.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { App, TFile } from 'obsidian';

type LinkCall = {
	filePath: string;
	sourcePath: string;
	subpath: string;
	displayText: string;
};

function createMockApp(initialDraggable?: ObsidianDraggable) {
	const calls: LinkCall[] = [];
	const app = {
		dragManager: {
			draggable: initialDraggable,
		},
		fileManager: {
			generateMarkdownLink: (
				file: TFile,
				sourcePath: string,
				subpath: string,
				displayText: string,
			) => {
				calls.push({
					filePath: file.path,
					sourcePath,
					subpath,
					displayText,
				});
				const suffix = subpath ? subpath : '';
				return `[[${file.path}${suffix}|${displayText}]]`;
			},
		},
	} as unknown as App;

	return { app, calls };
}

void test('getObsidianDraggable returns draggable from dragManager', () => {
	const file = { path: 'notes/task.md', basename: 'task' } as TFile;
	const draggable: ObsidianDraggable = { type: 'file', file };
	const { app } = createMockApp(draggable);
	assert.deepEqual(getObsidianDraggable(app), draggable);
});

void test('draggableToLinks converts file draggable into markdown link', () => {
	const file = { path: 'notes/task.md', basename: 'task' } as TFile;
	const { app, calls } = createMockApp();
	const links = draggableToLinks(app, 'boards/kanban.md', { type: 'file', file });

	assert.deepEqual(links, ['[[notes/task.md|task]]']);
	assert.deepEqual(calls, [
		{
			filePath: 'notes/task.md',
			sourcePath: 'boards/kanban.md',
			subpath: '',
			displayText: 'task',
		},
	]);
});

void test('draggableToLinks keeps parsed subpath for link draggable with file', () => {
	const file = { path: 'notes/task.md', basename: 'task' } as TFile;
	const { app, calls } = createMockApp();
	const links = draggableToLinks(app, 'boards/kanban.md', {
		type: 'link',
		linktext: 'notes/task#Heading',
		file,
	});

	assert.deepEqual(links, ['[[notes/task.md#Heading|task]]']);
	assert.deepEqual(calls, [
		{
			filePath: 'notes/task.md',
			sourcePath: 'boards/kanban.md',
			subpath: '#Heading',
			displayText: 'task',
		},
	]);
});

void test('draggableToLinks falls back to wikilink when link has no file', () => {
	const { app } = createMockApp();
	const links = draggableToLinks(app, 'boards/kanban.md', {
		type: 'link',
		linktext: 'Some note',
	});
	assert.deepEqual(links, ['[[Some note]]']);
});

void test('draggableToLinks returns empty for null draggable', () => {
	const { app } = createMockApp();
	assert.deepEqual(draggableToLinks(app, 'boards/kanban.md', null), []);
});
