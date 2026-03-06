import {
	readFrontmatterString,
	readFrontmatterValue,
	removeFrontmatterKey,
	setFrontmatterValue,
} from '../../frontmatter/file-frontmatter.ts';
import { assert, test } from 'vitest';

type FrontmatterMap = Record<string, Record<string, unknown>>;

const createMockFrontmatterApp = (
	initialFrontmatter: FrontmatterMap = {},
): {
	app: {
		metadataCache: {
			getFileCache: (file: { path: string }) => {
				frontmatter: Record<string, unknown> | undefined;
			};
		};
		fileManager: {
			processFrontMatter: (
				file: { path: string },
				updater: (frontmatter: Record<string, unknown>) => void,
			) => Promise<void>;
		};
	};
	frontmatterByPath: FrontmatterMap;
} => {
	const frontmatterByPath = Object.fromEntries(
		Object.entries(initialFrontmatter).map(([path, frontmatter]) => [path, { ...frontmatter }]),
	);
	const app = {
		metadataCache: {
			getFileCache: (file: { path: string }) => ({ frontmatter: frontmatterByPath[file.path] }),
		},
		fileManager: {
			processFrontMatter: (
				file: { path: string },
				updater: (frontmatter: Record<string, unknown>) => void,
			) => {
				const next = frontmatterByPath[file.path] ?? {};
				frontmatterByPath[file.path] = next;
				updater(next);
				return Promise.resolve();
			},
		},
	};

	return { app, frontmatterByPath };
};

void test('readFrontmatterValue returns raw value', () => {
	const file = { path: 'boards/work.md' };
	const { app } = createMockFrontmatterApp({
		[file.path]: { color: '#112233' },
	});
	assert.strictEqual(readFrontmatterValue(app, file, 'color'), '#112233');
});

void test('readFrontmatterString returns trimmed string or null', () => {
	const file = { path: 'boards/work.md' };
	const { app } = createMockFrontmatterApp({
		[file.path]: {
			color: '  #112233  ',
			blank: '   ',
			flag: true,
		},
	});
	assert.strictEqual(readFrontmatterString(app, file, 'color'), '#112233');
	assert.strictEqual(readFrontmatterString(app, file, 'blank'), null);
	assert.strictEqual(readFrontmatterString(app, file, 'flag'), null);
});

void test('setFrontmatterValue and removeFrontmatterKey update frontmatter', async () => {
	const file = { path: 'boards/work.md' };
	const { app, frontmatterByPath } = createMockFrontmatterApp();

	await setFrontmatterValue(app, file, 'color', '#445566');
	assert.strictEqual(frontmatterByPath[file.path]?.color, '#445566');

	await removeFrontmatterKey(app, file, 'color');
	assert.strictEqual(frontmatterByPath[file.path]?.color, undefined);
});
