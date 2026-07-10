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
): Promise<Awaited<ReturnType<typeof cleanupMissingTimelinkEventProperties>>> =>
	cleanupMissingTimelinkEventProperties(app);

function createMockApp(params: {
	frontmatterByPath: Record<string, Record<string, unknown> | undefined>;
	markdownByPath: Record<string, string>;
	staleLinkDestByPath?: Record<string, string>;
	freshMarkdownByPath?: Record<string, string>;
	freshMarkdownSequenceByPath?: Record<string, string[]>;
	missingAfterSnapshotPaths?: string[];
	replaceAfterSnapshotPaths?: string[];
}) {
	const filesByPath = new Map(
		Object.keys(params.markdownByPath).map((path) => [path, createFile(path)] as const),
	);
	const trashCalls: string[] = [];
	const modifyCalls: string[] = [];
	const freshReadCalls: string[] = [];
	const snapshottedPaths = new Set<string>();
	const missingAfterSnapshotPaths = new Set(params.missingAfterSnapshotPaths ?? []);
	const replaceAfterSnapshotPaths = new Set(params.replaceAfterSnapshotPaths ?? []);
	const freshReadIndexes = new Map<string, number>();
	const replacementFilesByPath = new Map<string, MockFile>();

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
			getAbstractFileByPath: (path: string) => {
				if (missingAfterSnapshotPaths.has(path) && snapshottedPaths.has(path)) return null;
				if (replaceAfterSnapshotPaths.has(path) && snapshottedPaths.has(path)) {
					const replacement = replacementFilesByPath.get(path) ?? createFile(path);
					replacementFilesByPath.set(path, replacement);
					return replacement;
				}
				return filesByPath.get(path) ?? null;
			},
			cachedRead: (file: MockFile) => {
				snapshottedPaths.add(file.path);
				return Promise.resolve(params.markdownByPath[file.path] ?? '');
			},
			read: (file: MockFile) => {
				freshReadCalls.push(file.path);
				const sequence = params.freshMarkdownSequenceByPath?.[file.path];
				const readIndex = freshReadIndexes.get(file.path) ?? 0;
				freshReadIndexes.set(file.path, readIndex + 1);
				const markdown =
					sequence?.[Math.min(readIndex, sequence.length - 1)] ??
					params.freshMarkdownByPath?.[file.path] ??
					params.markdownByPath[file.path] ??
					'';
				params.markdownByPath[file.path] = markdown;
				return Promise.resolve(markdown);
			},
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

	return { app, trashCalls, modifyCalls, freshReadCalls };
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
		'Events/Broken.md': '',
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
	assert.deepEqual([...trashCalls].sort(), ['Cards/Task.md', 'Events/Broken.md']);
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

void test('cleanupMissingTimelinkEventProperties preserves card notes with user frontmatter', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/Missing.md]]"`,
			'tags: [important]',
			'---',
			'',
		].join('\n'),
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': {
			[TIMELINK_EVENT_KEY]: '[[Events/Missing.md]]',
			tags: ['important'],
		},
	};
	const { app, trashCalls, modifyCalls } = createMockApp({ frontmatterByPath, markdownByPath });

	const result = await runCleanup(app as never);

	assert.strictEqual(result.cardNotesDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 1);
	assert.deepEqual(trashCalls, []);
	assert.deepEqual(modifyCalls, []);
	assert.deepEqual(frontmatterByPath['Cards/Task.md']?.tags, ['important']);
	assert.strictEqual(frontmatterByPath['Cards/Task.md']?.[TIMELINK_EVENT_KEY], undefined);
});

void test('cleanupMissingTimelinkEventProperties preserves nonempty property-less event notes', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/User Note.md]]"`,
			'---',
			'',
			'# Card note',
		].join('\n'),
		'Events/User Note.md': '# User content\n',
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/User Note.md]]' },
		'Events/User Note.md': undefined,
	};
	const { app, trashCalls, modifyCalls } = createMockApp({ frontmatterByPath, markdownByPath });

	const result = await runCleanup(app as never);

	assert.strictEqual(result.brokenEventLinks, 1);
	assert.strictEqual(result.eventsDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 1);
	assert.deepEqual(trashCalls, []);
	assert.deepEqual(modifyCalls, []);
	assert.strictEqual(markdownByPath['Events/User Note.md'], '# User content\n');
	assert.strictEqual(frontmatterByPath['Cards/Task.md']?.[TIMELINK_EVENT_KEY], undefined);
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

void test('cleanupMissingTimelinkEventProperties preserves unlinked property-less notes', async () => {
	const markdownByPath = {
		'Custom-Calendar/Broken.md': '2026-05-19 broken event\n',
		'Other/Broken.md': 'not a calendar event\n',
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Custom-Calendar/Broken.md': undefined,
		'Other/Broken.md': undefined,
	};
	const { app, trashCalls } = createMockApp({ frontmatterByPath, markdownByPath });

	const result = await runCleanup(app as never);

	assert.strictEqual(result.brokenEventLinks, 0);
	assert.strictEqual(result.eventsDeleted, 0);
	assert.deepEqual(trashCalls, []);
});

void test('cleanupMissingTimelinkEventProperties preserves a card note edited after discovery', async () => {
	const initialCardMarkdown = [
		'---',
		`${TIMELINK_EVENT_KEY}: "[[Events/Missing.md]]"`,
		'---',
		'',
	].join('\n');
	const editedCardMarkdown = `${initialCardMarkdown}\n# User edit\n`;
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': initialCardMarkdown,
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing.md]]' },
	};
	const { app, trashCalls, modifyCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		freshMarkdownByPath: { 'Cards/Task.md': editedCardMarkdown },
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.brokenEventLinks, 1);
	assert.strictEqual(result.cardNotesDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 0);
	assert.strictEqual(result.kanbanCardLinksCleared, 0);
	assert.deepEqual(trashCalls, []);
	assert.deepEqual(modifyCalls, []);
	assert.strictEqual(markdownByPath['Cards/Task.md'], editedCardMarkdown);
	assert.strictEqual(
		frontmatterByPath['Cards/Task.md']?.[TIMELINK_EVENT_KEY],
		'[[Events/Missing.md]]',
	);
});

void test('cleanupMissingTimelinkEventProperties preserves a freshly relinked empty card note', async () => {
	const initialCardMarkdown = [
		'---',
		`${TIMELINK_EVENT_KEY}: "[[Events/Missing.md]]"`,
		'---',
		'',
	].join('\n');
	const relinkedCardMarkdown = [
		'---',
		`${TIMELINK_EVENT_KEY}: "[[Events/New.md]]"`,
		'---',
		'',
	].join('\n');
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': initialCardMarkdown,
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing.md]]' },
	};
	const { app, trashCalls, modifyCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		freshMarkdownByPath: { 'Cards/Task.md': relinkedCardMarkdown },
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.cardNotesDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 0);
	assert.strictEqual(result.kanbanCardLinksCleared, 0);
	assert.deepEqual(trashCalls, []);
	assert.deepEqual(modifyCalls, []);
	assert.strictEqual(markdownByPath['Cards/Task.md'], relinkedCardMarkdown);
});

void test('cleanupMissingTimelinkEventProperties does not delete a card path removed after discovery', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': ['---', `${TIMELINK_EVENT_KEY}: "[[Events/Missing.md]]"`, '---', ''].join(
			'\n',
		),
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing.md]]' },
	};
	const { app, trashCalls, modifyCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		missingAfterSnapshotPaths: ['Cards/Task.md'],
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.cardNotesDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 0);
	assert.strictEqual(result.kanbanCardLinksCleared, 0);
	assert.deepEqual(trashCalls, []);
	assert.deepEqual(modifyCalls, []);
});

void test('cleanupMissingTimelinkEventProperties rechecks immediately before trashing a card note', async () => {
	const initialCardMarkdown = [
		'---',
		`${TIMELINK_EVENT_KEY}: "[[Events/Missing.md]]"`,
		'---',
		'',
	].join('\n');
	const lastMomentEdit = `${initialCardMarkdown}\nkeep this last-moment edit\n`;
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': initialCardMarkdown,
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing.md]]' },
	};
	const { app, trashCalls, modifyCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		freshMarkdownSequenceByPath: {
			'Cards/Task.md': [initialCardMarkdown, lastMomentEdit],
		},
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.cardNotesDeleted, 0);
	assert.strictEqual(result.kanbanCardLinksCleared, 0);
	assert.deepEqual(trashCalls, []);
	assert.deepEqual(modifyCalls, []);
	assert.strictEqual(markdownByPath['Cards/Task.md'], lastMomentEdit);
});

void test('cleanupMissingTimelinkEventProperties preserves an event note edited after discovery', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/Broken.md]]"`,
			'---',
			'',
			'# Saved card note',
		].join('\n'),
		'Events/Broken.md': '',
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Broken.md]]' },
		'Events/Broken.md': undefined,
	};
	const { app, trashCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		freshMarkdownByPath: { 'Events/Broken.md': '# Last-moment event edit\n' },
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.eventsDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 1);
	assert.deepEqual(trashCalls, []);
	assert.strictEqual(markdownByPath['Events/Broken.md'], '# Last-moment event edit\n');
});

void test('cleanupMissingTimelinkEventProperties does not trash a replacement at an event path', async () => {
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/Broken.md]]"`,
			'---',
			'',
			'# Saved card note',
		].join('\n'),
		'Events/Broken.md': '',
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Broken.md]]' },
		'Events/Broken.md': undefined,
	};
	const { app, trashCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		replaceAfterSnapshotPaths: ['Events/Broken.md'],
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.eventsDeleted, 0);
	assert.strictEqual(result.cardEventLinksRemoved, 1);
	assert.deepEqual(trashCalls, []);
});

void test('cleanupMissingTimelinkEventProperties does not overwrite a board edited after discovery', async () => {
	const initialBoardMarkdown = createBoardMarkdown('[[Cards/Task|Task]]');
	const editedBoardMarkdown = `${initialBoardMarkdown}\n## User edit\n`;
	const markdownByPath = {
		'Boards/Main.md': initialBoardMarkdown,
		'Cards/Task.md': ['---', `${TIMELINK_EVENT_KEY}: "[[Events/Missing.md]]"`, '---', ''].join(
			'\n',
		),
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing.md]]' },
	};
	const { app, modifyCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		freshMarkdownByPath: { 'Boards/Main.md': editedBoardMarkdown },
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.cardNotesDeleted, 1);
	assert.strictEqual(result.kanbanCardLinksCleared, 0);
	assert.deepEqual(modifyCalls, []);
	assert.strictEqual(markdownByPath['Boards/Main.md'], editedBoardMarkdown);
});

void test('cleanupMissingTimelinkEventProperties preserves a nonempty card note relinked after discovery', async () => {
	const initialCardMarkdown = [
		'---',
		`${TIMELINK_EVENT_KEY}: "[[Events/Missing.md]]"`,
		'---',
		'',
		'# Saved note',
	].join('\n');
	const relinkedCardMarkdown = initialCardMarkdown.replace('Events/Missing.md', 'Events/New.md');
	const markdownByPath = {
		'Boards/Main.md': createBoardMarkdown('[[Cards/Task|Task]]'),
		'Cards/Task.md': initialCardMarkdown,
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Boards/Main.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing.md]]' },
	};
	const { app } = createMockApp({
		frontmatterByPath,
		markdownByPath,
		freshMarkdownByPath: { 'Cards/Task.md': relinkedCardMarkdown },
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.cardEventLinksRemoved, 0);
	assert.strictEqual(markdownByPath['Cards/Task.md'], relinkedCardMarkdown);
	assert.strictEqual(
		frontmatterByPath['Cards/Task.md']?.[TIMELINK_EVENT_KEY],
		'[[Events/Missing.md]]',
	);
});

void test('cleanupMissingTimelinkEventProperties ignores a stale cached board marker', async () => {
	const ordinaryMarkdown = [
		'---',
		'title: Ordinary note',
		'---',
		'',
		'## Todo',
		'',
		'- [ ] [[Cards/Task|Task]]',
	].join('\n');
	const markdownByPath = {
		'Notes/Ordinary.md': ordinaryMarkdown,
		'Cards/Task.md': ['---', `${TIMELINK_EVENT_KEY}: "[[Events/Missing.md]]"`, '---', ''].join(
			'\n',
		),
	};
	const frontmatterByPath: Record<string, Record<string, unknown> | undefined> = {
		'Notes/Ordinary.md': { 'kanban-plugin': 'board' },
		'Cards/Task.md': { [TIMELINK_EVENT_KEY]: '[[Events/Missing.md]]' },
	};
	const { app, trashCalls, modifyCalls } = createMockApp({
		frontmatterByPath,
		markdownByPath,
	});

	const result = await runCleanup(app as never);

	assert.strictEqual(result.brokenEventLinks, 0);
	assert.deepEqual(trashCalls, []);
	assert.deepEqual(modifyCalls, []);
	assert.strictEqual(markdownByPath['Notes/Ordinary.md'], ordinaryMarkdown);
});
