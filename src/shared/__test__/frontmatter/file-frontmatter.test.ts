/* eslint-disable import/no-nodejs-modules, obsidianmd/no-tfile-tfolder-cast */
import {
	readFrontmatterString,
	readFrontmatterValue,
	removeFrontmatterKey,
	setFrontmatterValue,
} from '../../frontmatter/file-frontmatter.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { App, TFile } from 'obsidian';

type FrontmatterMap = Record<string, Record<string, unknown>>;

const createMockFrontmatterApp = (
	initialFrontmatter: FrontmatterMap = {},
): {
	app: App;
	frontmatterByPath: FrontmatterMap;
} => {
	const frontmatterByPath = Object.fromEntries(
		Object.entries(initialFrontmatter).map(([path, frontmatter]) => [path, { ...frontmatter }]),
	);
	const app = {
		metadataCache: {
			getFileCache: (file: TFile) => ({ frontmatter: frontmatterByPath[file.path] }),
		},
		fileManager: {
			processFrontMatter: async (
				file: TFile,
				updater: (frontmatter: Record<string, unknown>) => void,
			) => {
				const next = frontmatterByPath[file.path] ?? {};
				frontmatterByPath[file.path] = next;
				updater(next);
			},
		},
	} as unknown as App;

	return { app, frontmatterByPath };
};

void test('readFrontmatterValue returns raw value', () => {
	const file = { path: 'boards/work.md' } as TFile;
	const { app } = createMockFrontmatterApp({
		[file.path]: { color: '#112233' },
	});
	assert.equal(readFrontmatterValue(app, file, 'color'), '#112233');
});

void test('readFrontmatterString returns trimmed string or null', () => {
	const file = { path: 'boards/work.md' } as TFile;
	const { app } = createMockFrontmatterApp({
		[file.path]: {
			color: '  #112233  ',
			blank: '   ',
			flag: true,
		},
	});
	assert.equal(readFrontmatterString(app, file, 'color'), '#112233');
	assert.equal(readFrontmatterString(app, file, 'blank'), null);
	assert.equal(readFrontmatterString(app, file, 'flag'), null);
});

void test('setFrontmatterValue and removeFrontmatterKey update frontmatter', async () => {
	const file = { path: 'boards/work.md' } as TFile;
	const { app, frontmatterByPath } = createMockFrontmatterApp();

	await setFrontmatterValue(app, file, 'color', '#445566');
	assert.equal(frontmatterByPath[file.path]?.color, '#445566');

	await removeFrontmatterKey(app, file, 'color');
	assert.equal(frontmatterByPath[file.path]?.color, undefined);
});
