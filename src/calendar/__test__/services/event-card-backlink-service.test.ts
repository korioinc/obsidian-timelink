import {
	TIMELINK_CARD_KEY,
	TIMELINK_EVENT_KEY,
} from '../../../shared/frontmatter/timelink-frontmatter';
import {
	clearLinkedCardEventBacklink,
	syncLinkedCardEventBacklink,
	trashLinkedCardNoteIfBodyEmpty,
} from '../../services/event-card-backlink-service';
import type { App } from 'obsidian';
import { assert, test } from 'vitest';

const createMockApp = (
	cardFile: { path: string } | null,
	frontmatterByPath: Record<string, Record<string, unknown>>,
	trashCalls: string[] = [],
	markdownByPath: Record<string, string> = {},
): App =>
	({
		metadataCache: {
			getFirstLinkpathDest: (linkPath: string, sourcePath: string) => {
				assert.strictEqual(linkPath, 'Cards/Backlog card');
				assert.strictEqual(sourcePath, 'Events/2026-03-05 test.md');
				return cardFile;
			},
		},
		fileManager: {
			processFrontMatter: (
				file: { path: string },
				updater: (frontmatter: Record<string, unknown>) => void,
			) => {
				const nextFrontmatter = frontmatterByPath[file.path] ?? {};
				frontmatterByPath[file.path] = nextFrontmatter;
				updater(nextFrontmatter);
				return Promise.resolve();
			},
			generateMarkdownLink: (file: { path: string }) => `[[${file.path}|Event title]]`,
			trashFile: (file: { path: string }) => {
				trashCalls.push(file.path);
				return Promise.resolve();
			},
		},
		vault: {
			cachedRead: (file: { path: string }) => Promise.resolve(markdownByPath[file.path] ?? ''),
		},
	}) as unknown as App;

void test('clearLinkedCardEventBacklink removes event link from linked card frontmatter', async () => {
	const cardFile = { path: 'Cards/Backlog card.md' };
	const frontmatterByPath: Record<string, Record<string, unknown>> = {
		[cardFile.path]: {
			[TIMELINK_EVENT_KEY]: '[[Events/old.md|Old]]',
		},
	};
	const app = createMockApp(cardFile, frontmatterByPath);

	await clearLinkedCardEventBacklink(app, 'Events/2026-03-05 test.md', {
		[TIMELINK_CARD_KEY]: '[[Cards/Backlog card]]',
	});

	assert.strictEqual(frontmatterByPath[cardFile.path]?.[TIMELINK_EVENT_KEY], undefined);
});

void test('syncLinkedCardEventBacklink writes updated event link to linked card frontmatter', async () => {
	const cardFile = { path: 'Cards/Backlog card.md' };
	const eventFile = { path: 'Events/2026-03-05 test.md' };
	const frontmatterByPath: Record<string, Record<string, unknown>> = {
		[cardFile.path]: {},
	};
	const app = createMockApp(cardFile, frontmatterByPath);

	await syncLinkedCardEventBacklink({
		app,
		eventFile,
		sourcePath: 'Events/2026-03-05 test.md',
		eventTitle: 'Event title',
		frontmatter: {
			[TIMELINK_CARD_KEY]: '[[Cards/Backlog card]]',
		},
	});

	assert.strictEqual(
		frontmatterByPath[cardFile.path]?.[TIMELINK_EVENT_KEY],
		'[[Events/2026-03-05 test.md|Event title]]',
	);
});

void test('event-card backlink helpers no-op when linked card does not exist', async () => {
	const frontmatterByPath: Record<string, Record<string, unknown>> = {};
	const app = createMockApp(null, frontmatterByPath);

	await clearLinkedCardEventBacklink(app, 'Events/2026-03-05 test.md', {
		[TIMELINK_CARD_KEY]: '[[Cards/Backlog card]]',
	});
	await syncLinkedCardEventBacklink({
		app,
		eventFile: { path: 'Events/2026-03-05 test.md' },
		sourcePath: 'Events/2026-03-05 test.md',
		eventTitle: 'Event title',
		frontmatter: {
			[TIMELINK_CARD_KEY]: '[[Cards/Backlog card]]',
		},
	});

	assert.deepEqual(frontmatterByPath, {});
});

void test('trashLinkedCardNoteIfBodyEmpty trashes linked card file with frontmatter only', async () => {
	const cardFile = { path: 'Cards/Backlog card.md' };
	const frontmatterByPath: Record<string, Record<string, unknown>> = {};
	const trashCalls: string[] = [];
	const app = createMockApp(cardFile, frontmatterByPath, trashCalls, {
		[cardFile.path]: [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/2026-03-05 test.md]]"`,
			'---',
			'',
		].join('\n'),
	});

	const deleted = await trashLinkedCardNoteIfBodyEmpty(app, 'Events/2026-03-05 test.md', {
		[TIMELINK_CARD_KEY]: '[[Cards/Backlog card]]',
	});

	assert.strictEqual(deleted, true);
	assert.deepEqual(trashCalls, [cardFile.path]);
});

void test('trashLinkedCardNoteIfBodyEmpty keeps linked card file with body and removes event link', async () => {
	const cardFile = { path: 'Cards/Backlog card.md' };
	const frontmatterByPath: Record<string, Record<string, unknown>> = {
		[cardFile.path]: {
			[TIMELINK_EVENT_KEY]: '[[Events/2026-03-05 test.md|Event title]]',
		},
	};
	const trashCalls: string[] = [];
	const app = createMockApp(cardFile, frontmatterByPath, trashCalls, {
		[cardFile.path]: [
			'---',
			`${TIMELINK_EVENT_KEY}: "[[Events/2026-03-05 test.md]]"`,
			'---',
			'',
			'# Saved notes',
		].join('\n'),
	});

	const deleted = await trashLinkedCardNoteIfBodyEmpty(app, 'Events/2026-03-05 test.md', {
		[TIMELINK_CARD_KEY]: '[[Cards/Backlog card]]',
	});

	assert.strictEqual(deleted, false);
	assert.deepEqual(trashCalls, []);
	assert.strictEqual(frontmatterByPath[cardFile.path]?.[TIMELINK_EVENT_KEY], undefined);
});

void test('trashLinkedCardNoteIfBodyEmpty no-ops when event has no linked card file', async () => {
	const frontmatterByPath: Record<string, Record<string, unknown>> = {};
	const trashCalls: string[] = [];
	const app = createMockApp(null, frontmatterByPath, trashCalls);

	const deleted = await trashLinkedCardNoteIfBodyEmpty(app, 'Events/2026-03-05 test.md', {});

	assert.strictEqual(deleted, false);
	assert.deepEqual(trashCalls, []);
});
