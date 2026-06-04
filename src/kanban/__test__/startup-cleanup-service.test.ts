import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter.ts';
import {
	cleanupMissingTimelinkEventProperties,
	unlinkFirstWikiLinkTitle,
} from '../services/startup-cleanup-service.ts';
import { assert, test } from 'vitest';

type MockFile = {
	path: string;
	basename: string;
};

const createFile = (path: string): MockFile => {
	const name = path.split('/').pop() ?? path;
	return {
		path,
		basename: name.replace(/\.md$/, ''),
	};
};

const createBoardMarkdown = (cardTitle: string): string =>
	['---', 'kanban-plugin: board', '---', '', '## Todo', '', `- [ ] ${cardTitle}`].join('\n') + '\n';

const runCleanup = (
	app: Parameters<typeof cleanupMissingTimelinkEventProperties>[0],
	calendarFolderPath = 'Events',
): Promise<Awaited<ReturnType<typeof cleanupMissingTimelinkEventProperties>>> =>
	cleanupMissingTimelinkEventProperties(app, calendarFolderPath);

function createMockApp(params: {
	frontmatterByPath: Record<string, Record<string, unknown> | undefined>;
	markdownByPath: Record<string, string>;
	staleLinkDestByPath?: Record<string, string>;
}) {
	const filesByPath = new Map(
		Object.keys(params.markdownByPath).map((path) => [path, createFile(path)] as const),
	);
	const trashCalls: string[] = [];
	const modifyCalls: string[] = [];

	const resolveByLinkPath = (linkPath: string): MockFile | null => {
		const stalePath = params.staleLinkDestByPath?.[linkPath];
		if (stalePath) return createFile(stalePath);
		const direct = filesByPath.get(linkPath);
		if (direct) return direct;
		if (!linkPath.endsWith('.md')) {
			return filesByPath.get(`${linkPath}.md`) ?? null;
		}
		return null;
	};

	const app = {
		vault: {
			getMarkdownFiles: () => Array.from(filesByPath.values()),
			getAbstractFileByPath: (path: string) => filesByPath.get(path) ?? null,
			cachedRead: (file: MockFile) => Promise.resolve(params.markdownByPath[file.path] ?? ''),
			modify: (file: MockFile, data: string) => {
				params.markdownByPath[file.path] = data;
				modifyCalls.push(file.path);
				return Promise.resolve();
			},
		},
		metadataCache: {
			getFileCache: (file: MockFile) => ({
				frontmatter: params.frontmatterByPath[file.path],
			}),
			getFirstLinkpathDest: (linkPath: string) => resolveByLinkPath(linkPath),
		},
		fileManager: {
			processFrontMatter: (
				file: MockFile,
				updater: (frontmatter: Record<string, unknown>) => void,
			) => {
				const next = params.frontmatterByPath[file.path] ?? {};
				params.frontmatterByPath[file.path] = next;
				updater(next);
				return Promise.resolve();
			},
			trashFile: (file: MockFile) => {
				trashCalls.push(file.path);
				filesByPath.delete(file.path);
				delete params.markdownByPath[file.path];
				delete params.frontmatterByPath[file.path];
				return Promise.resolve();
			},
		},
	};

	return { app, trashCalls, modifyCalls };
}

void test('unlinkFirstWikiLinkTitle replaces the primary card link with display text', () => {
	assert.strictEqual(
		unlinkFirstWikiLinkTitle('[[Cards/Task|Task label]]\nkept body', createFile('Cards/Task.md')),
		'Task label\nkept body',
	);
	assert.strictEqual(
		unlinkFirstWikiLinkTitle('[[Cards/Task]]', createFile('Cards/Task.md')),
		'Task',
	);
});

void test('cleanupMissingTimelinkEventProperties deletes property-less event and empty linked note while clearing board link', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': ['---', `${TIMELINK_EVENT_KEY}: "[[Events/Broken.md]]"`, '---', ''].join('\n'),
		'Events/Broken.md': '2026-05-19 broken event\n',
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Broken.md]]' },
		'Events/Broken.md': undefined,
	};
	const { app, trashCalls, modifyCalls } = createMockApp({ frontmatterByPath, markdownByPath });

	const result = await runCleanup(app as never);

	assert.deepEqual(result, {
		brokenEventLinks: 1,
		eventsDeleted: 1,
		cardNotesDeleted: 1,
		cardEventLinksRemoved: 0,
		kanbanCardLinksCleared: 1,
		kanbanBoardsUpdated: 1,
	});
	assert.deepEqual(trashCalls, ['Events/Broken.md', 'Cards/Task.md']);
	assert.deepEqual(modifyCalls, ['Boards/Main.md']);
	assert.match(markdownByPath['Boards/Main.md'], /- \[ \] Task\n/);
	assert.strictEqual(/\[\[Cards\/Task/.test(markdownByPath['Boards/Main.md']), false);
});

void test('cleanupMissingTimelinkEventProperties keeps nonempty linked note and removes its broken event link', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]\n  keep this detail'),
		'Cards/Task.md': [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/Broken.md]]"`,
			'---',
			'',
			'# Saved note',
		].join('\n'),
		'Events/Broken.md': '',
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Broken.md]]' },
		'Events/Broken.md': undefined,
	};
	const { app, trashCalls } = createMockApp({ frontmatterByPath, markdownByPath });

	const result = await runCleanup(app as never);

	assert.strictEqual(result.eventsDeleted, 1);
	assert.strictEqual(result.cardNotesDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 1);
	assert.strictEqual(result.kanbanCardLinksCleared, 0);
	assert.deepEqual(trashCalls, ['Events/Broken.md']);
	assert.strictEqual(frontmatterByPath['Cards/Task.md']?.[TIMELINK_EVENT_KEY], undefined);
	assert.strictEqual(
		markdownByPath['Boards/Main.md'].includes('- [ ] [[Cards/Task|Task]]\n  keep this detail\n'),
		true,
	);
});

void test('cleanupMissingTimelinkEventProperties ignores stale metadata links after deleting calendar event', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]\n  keep this detail'),
		'Cards/Task.md': [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/Broken.md]]"`,
			'---',
			'',
			'# Saved note',
		].join('\n'),
		'Events/Broken.md': '',
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Broken.md]]' },
		'Events/Broken.md': undefined,
	};
	const { app, trashCalls, modifyCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		staleLinkDestByPath: { 'Events/Broken.md': 'Events/Broken.md' },
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.eventsDeleted, 1);
	assert.strictEqual(result.cardNotesDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 1);
	assert.strictEqual(result.kanbanCardLinksCleared, 0);
	assert.deepEqual(trashCalls, ['Events/Broken.md']);
	assert.deepEqual(modifyCalls, []);
	assert.strictEqual(frontmatterByPath['Cards/Task.md']?.[TIMELINK_EVENT_KEY], undefined);
});

void test('cleanupMissingTimelinkEventProperties deletes only empty board notes whose event target is missing', async () => {
	const markdownByPath = {
		'Boards/Main.md':
			[
				'---',
				'kanban-plugin: board',
				'---',
				'',
				'## Todo',
				'',
				'- [ ] [[Cards/Empty Task|Empty task]]',
				'- [ ] [[Cards/Saved Task|Saved task]]',
			].join('\n') + '\n',
		'Cards/Empty Task.md': [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/Missing Empty.md]]"`,
			'---',
			'',
		].join('\n'),
		'Cards/Saved Task.md': [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/Missing Saved.md]]"`,
			'---',
			'',
			'keep this note',
		].join('\n'),
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Empty Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing Empty.md]]' },
		'Cards/Saved Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing Saved.md]]' },
	};
	const { app, trashCalls, modifyCalls } = createMockApp({ frontmatterByPath, markdownByPath });

	const result = await runCleanup(app as never);

	assert.deepEqual(result, {
		brokenEventLinks: 2,
		eventsDeleted: 0,
		cardNotesDeleted: 1,
		cardEventLinksRemoved: 1,
		kanbanCardLinksCleared: 1,
		kanbanBoardsUpdated: 1,
	});
	assert.deepEqual(trashCalls, ['Cards/Empty Task.md']);
	assert.deepEqual(modifyCalls, ['Boards/Main.md']);
	assert.match(markdownByPath['Boards/Main.md'], /- \[ \] Empty task\n/);
	assert.match(markdownByPath['Boards/Main.md'], /\[\[Cards\/Saved Task\|Saved task\]\]/);
	assert.strictEqual(frontmatterByPath['Cards/Saved Task.md']?.[TIMELINK_EVENT_KEY], undefined);
});

void test('cleanupMissingTimelinkEventProperties skips linked events that still have properties', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': ['---', `${TIMELINK_EVENT_KEY}: "[[Events/Good.md]]"`, '---', ''].join('\n'),
		'Events/Good.md': ['---', 'title: Task', 'date: 2026-05-19', '---', ''].join('\n'),
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Good.md]]' },
		'Events/Good.md': { title: 'Task', date: '2026-05-19' },
	};
	const { app, trashCalls, modifyCalls } = createMockApp({ frontmatterByPath, markdownByPath });

	const result = await runCleanup(app as never);

	assert.strictEqual(result.brokenEventLinks, 0);
	assert.deepEqual(trashCalls, []);
	assert.deepEqual(modifyCalls, []);
	assert.match(markdownByPath['Boards/Main.md'], /\[\[Cards\/Task\|Task\]\]/);
});

void test('cleanupMissingTimelinkEventProperties deletes property-less event inside configured calendar folder', async () => {
	const markdownByPath = {
		'Custom-Calendar/Broken.md': '2026-05-19 broken event\n',
		'Other/Broken.md': 'not a calendar event\n',
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Custom-Calendar/Broken.md': undefined,
		'Other/Broken.md': undefined,
	};
	const { app, trashCalls } = createMockApp({ frontmatterByPath, markdownByPath });

	const result = await runCleanup(app as never, 'Custom-Calendar');

	assert.strictEqual(result.brokenEventLinks, 1);
	assert.strictEqual(result.eventsDeleted, 1);
	assert.deepEqual(trashCalls, ['Custom-Calendar/Broken.md']);
});
