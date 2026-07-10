import { removeFrontmatterKey } from '../../shared/frontmatter/file-frontmatter';
import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import {
	clearKanbanCardLinks,
	createBoardCardLinkCleanupPlan,
} from './startup-cleanup-board-links';
import {
	collectEmptyCardPaths,
	discoverStartupCleanupCandidates,
	isDisposableCardMarkdown,
	type CleanupApp,
	type CleanupFile,
} from './startup-cleanup-discovery';
import type { App } from 'obsidian';

export { unlinkFirstWikiLinkTitle } from './startup-cleanup-board-links';

type CleanupDiscovery = Awaited<ReturnType<typeof discoverStartupCleanupCandidates>>;
type BrokenEventLink = CleanupDiscovery['brokenLinks'][number];
type MissingEventTargetCard = CleanupDiscovery['missingEventTargetCards'][number];
type ReadMarkdown = CleanupDiscovery['readMarkdown'];

type StartupCleanupResult = {
	brokenEventLinks: number;
	eventsDeleted: number;
	cardNotesDeleted: number;
	cardEventLinksRemoved: number;
	kanbanCardLinksCleared: number;
	kanbanBoardsUpdated: number;
};

const EMPTY_RESULT: StartupCleanupResult = {
	brokenEventLinks: 0,
	eventsDeleted: 0,
	cardNotesDeleted: 0,
	cardEventLinksRemoved: 0,
	kanbanCardLinksCleared: 0,
	kanbanBoardsUpdated: 0,
};

function uniqueFiles(files: CleanupFile[]): CleanupFile[] {
	const byPath = new Map<string, CleanupFile>();
	files.forEach((file) => byPath.set(file.path, file));
	return Array.from(byPath.values());
}

async function readUnchangedLiveMarkdown(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	file: CleanupFile,
): Promise<string | null> {
	const liveFile = app.vault.getAbstractFileByPath(file.path);
	if (liveFile !== file) return null;
	try {
		const expectedMarkdown = await readMarkdown(file);
		const freshMarkdown = await app.vault.read(file);
		if (app.vault.getAbstractFileByPath(file.path) !== file) return null;
		return freshMarkdown === expectedMarkdown ? freshMarkdown : null;
	} catch (error) {
		console.error(`Failed to revalidate startup cleanup target: ${file.path}`, error);
		return null;
	}
}

async function cardMatchesDisposableSnapshot(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	cardFile: CleanupFile,
): Promise<boolean> {
	const freshMarkdown = await readUnchangedLiveMarkdown(app, readMarkdown, cardFile);
	return freshMarkdown !== null && isDisposableCardMarkdown(freshMarkdown);
}

async function eventMatchesDisposableSnapshot(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	eventFile: CleanupFile,
): Promise<boolean> {
	const freshMarkdown = await readUnchangedLiveMarkdown(app, readMarkdown, eventFile);
	if (freshMarkdown === null || freshMarkdown.trim()) return false;
	const currentFrontmatter = app.metadataCache.getFileCache(eventFile)?.frontmatter;
	return !currentFrontmatter || Object.keys(currentFrontmatter).length === 0;
}

async function revalidateDisposableCardPaths(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	cardFiles: CleanupFile[],
	candidatePaths: ReadonlySet<string>,
): Promise<Set<string>> {
	const confirmedPaths = new Set<string>();
	for (const cardFile of cardFiles) {
		if (!candidatePaths.has(cardFile.path)) continue;
		if (await cardMatchesDisposableSnapshot(app, readMarkdown, cardFile)) {
			confirmedPaths.add(cardFile.path);
		}
	}
	return confirmedPaths;
}

async function removeCardEventLinks(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	cardFiles: CleanupFile[],
	deletionCandidatePaths: ReadonlySet<string>,
	confirmedDeletionPaths: ReadonlySet<string>,
): Promise<{
	cardNotesDeleted: number;
	cardEventLinksRemoved: number;
	deletedCardPaths: Set<string>;
}> {
	let cardNotesDeleted = 0;
	let cardEventLinksRemoved = 0;
	const deletedCardPaths = new Set<string>();

	for (const cardFile of cardFiles) {
		if (deletionCandidatePaths.has(cardFile.path)) {
			if (!confirmedDeletionPaths.has(cardFile.path)) continue;
			if (!(await cardMatchesDisposableSnapshot(app, readMarkdown, cardFile))) continue;
			await app.fileManager.trashFile(cardFile);
			deletedCardPaths.add(cardFile.path);
			cardNotesDeleted += 1;
			continue;
		}
		if ((await readUnchangedLiveMarkdown(app, readMarkdown, cardFile)) === null) continue;
		await removeFrontmatterKey(app, cardFile, TIMELINK_EVENT_KEY);
		cardEventLinksRemoved += 1;
	}

	return { cardNotesDeleted, cardEventLinksRemoved, deletedCardPaths };
}

async function trashUnchangedEmptyEventFiles(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	files: CleanupFile[],
): Promise<number> {
	let deletedFiles = 0;
	for (const file of files) {
		if (!(await eventMatchesDisposableSnapshot(app, readMarkdown, file))) continue;
		await app.fileManager.trashFile(file);
		deletedFiles += 1;
	}
	return deletedFiles;
}

function getBrokenEventCount(
	brokenLinks: BrokenEventLink[],
	missingEventTargetCards: MissingEventTargetCard[],
): number {
	const eventPaths = new Set(brokenLinks.map((link) => link.eventPath));
	missingEventTargetCards.forEach((target) => {
		eventPaths.add(target.eventPath.endsWith('.md') ? target.eventPath : `${target.eventPath}.md`);
	});
	return eventPaths.size;
}

async function cleanupMissingTimelinkEventPropertiesForApp(
	app: CleanupApp,
): Promise<StartupCleanupResult> {
	const { readMarkdown, boardSources, missingEventTargetCards, brokenLinks } =
		await discoverStartupCleanupCandidates(app);
	const brokenEventFiles = uniqueFiles(
		brokenLinks.flatMap((link) => (link.eventFileToDelete ? [link.eventFileToDelete] : [])),
	);
	if (brokenLinks.length === 0 && missingEventTargetCards.length === 0) {
		return { ...EMPTY_RESULT };
	}

	const cardFiles = uniqueFiles([
		...brokenLinks.map((link) => link.cardFile),
		...missingEventTargetCards.map((target) => target.cardFile),
	]);
	const deletionCandidatePaths = await collectEmptyCardPaths(readMarkdown, cardFiles);
	brokenLinks.forEach((link) => {
		if (!link.eventFileToDelete) deletionCandidatePaths.delete(link.cardFile.path);
	});
	const confirmedDeletionPaths = await revalidateDisposableCardPaths(
		app,
		readMarkdown,
		cardFiles,
		deletionCandidatePaths,
	);
	const boardLinkCleanupPlan = createBoardCardLinkCleanupPlan(
		app,
		boardSources,
		confirmedDeletionPaths,
	);
	const cardCleanup =
		cardFiles.length > 0
			? await removeCardEventLinks(
					app,
					readMarkdown,
					cardFiles,
					deletionCandidatePaths,
					confirmedDeletionPaths,
				)
			: {
					cardNotesDeleted: 0,
					cardEventLinksRemoved: 0,
					deletedCardPaths: new Set<string>(),
				};
	const boardCleanup =
		cardCleanup.deletedCardPaths.size > 0
			? await clearKanbanCardLinks(app, boardLinkCleanupPlan, cardCleanup.deletedCardPaths)
			: { boardsUpdated: 0, cardLinksCleared: 0 };
	const brokenEventsDeleted = await trashUnchangedEmptyEventFiles(
		app,
		readMarkdown,
		brokenEventFiles,
	);

	return {
		brokenEventLinks: getBrokenEventCount(brokenLinks, missingEventTargetCards),
		eventsDeleted: brokenEventsDeleted,
		cardNotesDeleted: cardCleanup.cardNotesDeleted,
		cardEventLinksRemoved: cardCleanup.cardEventLinksRemoved,
		kanbanCardLinksCleared: boardCleanup.cardLinksCleared,
		kanbanBoardsUpdated: boardCleanup.boardsUpdated,
	};
}

export async function cleanupMissingTimelinkEventProperties(
	app: App,
): Promise<StartupCleanupResult> {
	return cleanupMissingTimelinkEventPropertiesForApp(app as unknown as CleanupApp);
}

export function hasStartupCleanupChanges(result: StartupCleanupResult): boolean {
	return (
		result.eventsDeleted > 0 ||
		result.cardNotesDeleted > 0 ||
		result.cardEventLinksRemoved > 0 ||
		result.kanbanCardLinksCleared > 0
	);
}
