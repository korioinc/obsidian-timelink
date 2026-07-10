import { createEventFromCard } from '../services/card-action-service.ts';
import type { KanbanBoard } from '../types.ts';
import { assert, test, vi } from 'vitest';

class MockTFile {
	path = '';
	basename = '';
}

class MockTFolder {
	path = '';
}

type FailureStage = 'update-card' | 'create-event' | 'event-frontmatter' | 'card-frontmatter';

const CARD_EVENT_PROPERTY = 'timelinkEvent';
const EVENT_CARD_PROPERTY = 'timelinkCard';
const CARD_PATH = 'Cards/Task.md';
const EVENT_PATH = 'Events/Task.md';

const createFile = (path: string): MockTFile => {
	const file = new MockTFile();
	file.path = path;
	file.basename = path.split('/').at(-1)?.replace(/\.md$/i, '') ?? '';
	return file;
};

const createBoard = (): KanbanBoard => ({
	settings: {},
	lanes: [
		{
			id: 'lane-1',
			title: 'Todo',
			cards: [{ id: 'card-1', title: 'Task' }],
		},
	],
});

const createHarness = (
	options: {
		failureStage?: FailureStage;
		resolveCreatedEvent?: boolean;
		resolveCreatedEventAsFolder?: boolean;
		deleteEventError?: boolean;
		cardRollbackError?: boolean;
		initialCardEventValue?: unknown;
	} = {},
) => {
	const calls: string[] = [];
	const notices: string[] = [];
	const filesByPath = new Map<string, MockTFile | MockTFolder>();
	const frontmatterByPath = new Map<string, Record<string, unknown>>();
	const boardFile = createFile('Boards/Board.md');
	const board = createBoard();
	filesByPath.set(boardFile.path, boardFile);
	if (Object.prototype.hasOwnProperty.call(options, 'initialCardEventValue')) {
		const cardFile = createFile(CARD_PATH);
		filesByPath.set(cardFile.path, cardFile);
		frontmatterByPath.set(cardFile.path, {
			[CARD_EVENT_PROPERTY]: options.initialCardEventValue,
		});
	}
	let cardTitle = 'Task';
	let frontmatterFailureConsumed = false;
	let createEventFailureConsumed = false;

	const app = {
		vault: {
			getAbstractFileByPath: (path: string) => filesByPath.get(path) ?? null,
			create: (path: string) => {
				calls.push(`createCardNote:${path}`);
				const file = createFile(path);
				filesByPath.set(path, file);
				frontmatterByPath.set(path, {});
				return Promise.resolve(file);
			},
		},
		metadataCache: {
			getFirstLinkpathDest: (linkPath: string, sourcePath: string) => {
				if (
					sourcePath === boardFile.path &&
					(linkPath === 'Cards/Task' || linkPath === CARD_PATH)
				) {
					return filesByPath.get(CARD_PATH) ?? null;
				}
				return null;
			},
			getFileCache: (file: MockTFile) => ({
				frontmatter: frontmatterByPath.get(file.path) ?? {},
			}),
		},
		fileManager: {
			getNewFileParent: () => ({ path: 'Cards' }),
			getAvailablePathForAttachment: (path: string) => Promise.resolve(path),
			processFrontMatter: (
				file: MockTFile,
				updater: (frontmatter: Record<string, unknown>) => void,
			) => {
				calls.push(`frontmatter:${file.path}`);
				const frontmatter = frontmatterByPath.get(file.path) ?? {};
				const failureStage = file.path === EVENT_PATH ? 'event-frontmatter' : 'card-frontmatter';
				if (options.failureStage === failureStage && !frontmatterFailureConsumed) {
					frontmatterFailureConsumed = true;
					if (failureStage === 'card-frontmatter') {
						updater(frontmatter);
						frontmatterByPath.set(file.path, frontmatter);
					}
					return Promise.reject(new Error(`${failureStage} failed`));
				}
				if (options.cardRollbackError && file.path === CARD_PATH && frontmatterFailureConsumed) {
					return Promise.reject(new Error('card rollback failed'));
				}
				updater(frontmatter);
				frontmatterByPath.set(file.path, frontmatter);
				return Promise.resolve();
			},
		},
	};

	const calendar = {
		getCalendar: () => ({
			createEvent: () => {
				calls.push('createEvent');
				if (options.failureStage === 'create-event' && !createEventFailureConsumed) {
					createEventFailureConsumed = true;
					return Promise.reject(new Error('create event failed'));
				}
				if (options.resolveCreatedEventAsFolder) {
					const eventFolder = new MockTFolder();
					eventFolder.path = EVENT_PATH;
					filesByPath.set(eventFolder.path, eventFolder);
				} else if (options.resolveCreatedEvent !== false) {
					const eventFile = createFile(EVENT_PATH);
					filesByPath.set(eventFile.path, eventFile);
					frontmatterByPath.set(eventFile.path, {});
				}
				return Promise.resolve({ file: { path: EVENT_PATH } });
			},
			deleteEvent: () => {
				calls.push('deleteEvent');
				if (options.deleteEventError) {
					return Promise.reject(new Error('delete event failed'));
				}
				filesByPath.delete(EVENT_PATH);
				frontmatterByPath.delete(EVENT_PATH);
				return Promise.resolve();
			},
		}),
	};

	const context = {
		app,
		file: boardFile,
		board,
		calendar,
		getTodayDateKey: () => '2026-03-02',
		cardEventProperty: CARD_EVENT_PROPERTY,
		eventCardProperty: EVENT_CARD_PROPERTY,
		getCardTitle: () => cardTitle,
		ensureCardBlockId: () => Promise.resolve(null),
		notice: (message: string) => {
			notices.push(message);
		},
		updateCardTitleWithLink: (_cardId: string, link: string) => {
			calls.push('updateCard');
			if (options.failureStage === 'update-card') {
				return Promise.reject(new Error('update card failed'));
			}
			cardTitle = link;
			const card = board.lanes[0]?.cards[0];
			if (card) card.title = link;
			return Promise.resolve();
		},
	};

	return {
		calls,
		context,
		filesByPath,
		frontmatterByPath,
		notices,
	};
};

const runMuted = async (run: () => Promise<void>) => {
	const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
	try {
		await run();
	} finally {
		error.mockRestore();
	}
};

void test('createEventFromCard links the reusable card note before creating and linking the event', async () => {
	const harness = createHarness();

	await createEventFromCard(harness.context as never, 'card-1');

	assert.deepEqual(harness.calls, [
		`createCardNote:${CARD_PATH}`,
		'updateCard',
		'createEvent',
		`frontmatter:${EVENT_PATH}`,
		`frontmatter:${CARD_PATH}`,
	]);
	assert.strictEqual(
		harness.frontmatterByPath.get(CARD_PATH)?.[CARD_EVENT_PROPERTY],
		`[[${EVENT_PATH}]]`,
	);
	assert.strictEqual(
		harness.frontmatterByPath.get(EVENT_PATH)?.[EVENT_CARD_PROPERTY],
		`[[${CARD_PATH}]]`,
	);
	assert.deepEqual(harness.notices, ['Event created from card.']);
});

void test('createEventFromCard does not create an event when linking the card note fails', async () => {
	const harness = createHarness({ failureStage: 'update-card' });

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [`createCardNote:${CARD_PATH}`, 'updateCard']);
	assert.strictEqual(harness.filesByPath.has(CARD_PATH), true);
	assert.deepEqual(harness.notices, [
		'Failed to prepare the card note for event creation. The card note was kept so you can retry.',
	]);
});

void test('createEventFromCard keeps the linked card note when event creation fails', async () => {
	const harness = createHarness({ failureStage: 'create-event' });

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [`createCardNote:${CARD_PATH}`, 'updateCard', 'createEvent']);
	assert.strictEqual(harness.filesByPath.has(CARD_PATH), true);
	assert.deepEqual(harness.notices, [
		'Failed to create event from card. The card note was kept so you can retry.',
	]);
});

void test('createEventFromCard reuses the linked card note when retrying after event failure', async () => {
	const harness = createHarness({ failureStage: 'create-event' });

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));
	await createEventFromCard(harness.context as never, 'card-1');

	assert.deepEqual(harness.calls, [
		`createCardNote:${CARD_PATH}`,
		'updateCard',
		'createEvent',
		'createEvent',
		`frontmatter:${EVENT_PATH}`,
		`frontmatter:${CARD_PATH}`,
	]);
	assert.deepEqual(harness.notices, [
		'Failed to create event from card. The card note was kept so you can retry.',
		'Event created from card.',
	]);
});

void test('createEventFromCard removes an event that cannot be resolved to a file', async () => {
	const harness = createHarness({ resolveCreatedEvent: false });

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [
		`createCardNote:${CARD_PATH}`,
		'updateCard',
		'createEvent',
		'deleteEvent',
	]);
	assert.deepEqual(harness.notices, [
		'Failed to create event from card. The incomplete event was removed; the card note was kept for retry.',
	]);
});

void test('createEventFromCard rejects an event location that resolves to a folder', async () => {
	const harness = createHarness({ resolveCreatedEventAsFolder: true });

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [
		`createCardNote:${CARD_PATH}`,
		'updateCard',
		'createEvent',
		'deleteEvent',
	]);
	assert.deepEqual(harness.notices, [
		'Failed to create event from card. The incomplete event was removed; the card note was kept for retry.',
	]);
});

void test('createEventFromCard removes an event when its backlink cannot be saved', async () => {
	const harness = createHarness({ failureStage: 'event-frontmatter' });

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [
		`createCardNote:${CARD_PATH}`,
		'updateCard',
		'createEvent',
		`frontmatter:${EVENT_PATH}`,
		'deleteEvent',
	]);
	assert.strictEqual(harness.frontmatterByPath.get(CARD_PATH)?.[CARD_EVENT_PROPERTY], undefined);
	assert.deepEqual(harness.notices, [
		'Failed to create event from card. The incomplete event was removed; the card note was kept for retry.',
	]);
});

void test('createEventFromCard rolls back the card link before deleting an incomplete event', async () => {
	const harness = createHarness({ failureStage: 'card-frontmatter' });

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [
		`createCardNote:${CARD_PATH}`,
		'updateCard',
		'createEvent',
		`frontmatter:${EVENT_PATH}`,
		`frontmatter:${CARD_PATH}`,
		`frontmatter:${CARD_PATH}`,
		'deleteEvent',
	]);
	assert.strictEqual(harness.frontmatterByPath.get(CARD_PATH)?.[CARD_EVENT_PROPERTY], undefined);
	assert.deepEqual(harness.notices, [
		'Failed to create event from card. The incomplete event was removed; the card note was kept for retry.',
	]);
});

void test('createEventFromCard restores an existing card note property during rollback', async () => {
	const harness = createHarness({
		failureStage: 'card-frontmatter',
		initialCardEventValue: null,
	});

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [
		'updateCard',
		'createEvent',
		`frontmatter:${EVENT_PATH}`,
		`frontmatter:${CARD_PATH}`,
		`frontmatter:${CARD_PATH}`,
		'deleteEvent',
	]);
	assert.strictEqual(harness.frontmatterByPath.get(CARD_PATH)?.[CARD_EVENT_PROPERTY], null);
	assert.deepEqual(harness.notices, [
		'Failed to create event from card. The incomplete event was removed; the card note was kept for retry.',
	]);
});

void test('createEventFromCard reports when incomplete event cleanup also fails', async () => {
	const harness = createHarness({
		resolveCreatedEvent: false,
		deleteEventError: true,
	});

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [
		`createCardNote:${CARD_PATH}`,
		'updateCard',
		'createEvent',
		'deleteEvent',
	]);
	assert.deepEqual(harness.notices, [
		`Event creation was incomplete. The event remains at ${EVENT_PATH}; remove or repair it before retrying.`,
	]);
});

void test('createEventFromCard preserves the event when a partial card link cannot be rolled back', async () => {
	const harness = createHarness({
		failureStage: 'card-frontmatter',
		cardRollbackError: true,
	});

	await runMuted(() => createEventFromCard(harness.context as never, 'card-1'));

	assert.deepEqual(harness.calls, [
		`createCardNote:${CARD_PATH}`,
		'updateCard',
		'createEvent',
		`frontmatter:${EVENT_PATH}`,
		`frontmatter:${CARD_PATH}`,
		`frontmatter:${CARD_PATH}`,
	]);
	assert.strictEqual(harness.filesByPath.has(EVENT_PATH), true);
	assert.deepEqual(harness.notices, [
		'Event creation was incomplete. Links may be partially saved, so the event and card note were kept for recovery.',
	]);
});
