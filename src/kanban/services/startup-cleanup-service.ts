import { removeFrontmatterKey } from '../../shared/frontmatter/file-frontmatter';
import {
	extractFrontmatterBody,
	parseFrontmatterValue,
} from '../../shared/frontmatter/markdown-frontmatter';
import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import { extractFirstWikiLinkPath, parseWikiLinkParts } from '../../shared/utils/wiki-link';
import type { KanbanBoard, KanbanCard } from '../types';
import { splitCardTitle } from '../utils/card-title';
import { resolveLinkedCardFile } from './card-service';
import { isKanbanBoard, parseKanbanBoard, serializeKanbanBoard } from './parser-service';
import type { App } from 'obsidian';

type CleanupFile = {
	path: string;
	basename: string;
};

type CleanupApp = {
	vault: {
		getMarkdownFiles(): CleanupFile[];
		getAbstractFileByPath(path: string): unknown;
		cachedRead(file: CleanupFile): Promise<string>;
		modify(file: CleanupFile, data: string): Promise<void>;
	};
	metadataCache: {
		getFileCache(file: CleanupFile): { frontmatter?: Record<string, unknown> } | null | undefined;
		getFirstLinkpathDest(path: string, sourcePath: string): unknown;
	};
	fileManager: {
		processFrontMatter(
			file: CleanupFile,
			updater: (frontmatter: Record<string, unknown>) => void,
		): Promise<void>;
		trashFile(file: CleanupFile): Promise<void>;
	};
};

type BrokenEventLink = {
	cardFile: CleanupFile;
	eventFile: CleanupFile;
};

type MissingEventTargetCard = {
	cardFile: CleanupFile;
	eventPath: string;
};

export type StartupCleanupResult = {
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

function isFileLike(file: unknown): file is CleanupFile {
	if (!file || typeof file !== 'object') return false;
	const path = (file as { path?: unknown }).path;
	const basename = (file as { basename?: unknown }).basename;
	return typeof path === 'string' && typeof basename === 'string';
}

function uniqueFiles(files: CleanupFile[]): CleanupFile[] {
	const byPath = new Map<string, CleanupFile>();
	files.forEach((file) => byPath.set(file.path, file));
	return Array.from(byPath.values());
}

async function readFrontmatterBody(
	app: CleanupApp,
	file: CleanupFile,
): Promise<string | undefined> {
	const markdown = await app.vault.cachedRead(file);
	return extractFrontmatterBody(markdown);
}

async function readTimelinkEventValue(app: CleanupApp, file: CleanupFile): Promise<string | null> {
	const cache = app.metadataCache.getFileCache(file);
	const cachedFrontmatter = cache?.frontmatter;
	const cachedValue = cachedFrontmatter?.[TIMELINK_EVENT_KEY];
	if (typeof cachedValue === 'string' && cachedValue.trim()) {
		return cachedValue.trim();
	}
	if (cache && !cachedFrontmatter) return null;
	const frontmatterBody = await readFrontmatterBody(app, file);
	if (!frontmatterBody) return null;
	return parseFrontmatterValue(frontmatterBody, TIMELINK_EVENT_KEY) ?? null;
}

function resolveEventFile(
	app: CleanupApp,
	cardFile: CleanupFile,
	eventLink: string,
): CleanupFile | null {
	const eventPath = extractFirstWikiLinkPath(eventLink);
	if (!eventPath) return null;
	const linkedFile = app.metadataCache.getFirstLinkpathDest(eventPath, cardFile.path);
	if (isFileLike(linkedFile)) {
		const liveLinkedFile = app.vault.getAbstractFileByPath(linkedFile.path);
		if (isFileLike(liveLinkedFile)) return liveLinkedFile;
	}
	const directFile = app.vault.getAbstractFileByPath(eventPath);
	if (isFileLike(directFile)) return directFile;
	if (eventPath.endsWith('.md')) return null;
	const markdownFile = app.vault.getAbstractFileByPath(`${eventPath}.md`);
	return isFileLike(markdownFile) ? markdownFile : null;
}

async function fileHasFrontmatterProperties(app: CleanupApp, file: CleanupFile): Promise<boolean> {
	const cache = app.metadataCache.getFileCache(file);
	const cachedFrontmatter = cache?.frontmatter;
	if (cachedFrontmatter) return Object.keys(cachedFrontmatter).length > 0;
	if (cache && !cachedFrontmatter) return false;
	const frontmatterBody = await readFrontmatterBody(app, file);
	return Boolean(frontmatterBody?.trim());
}

async function collectBrokenEventLinks(app: CleanupApp): Promise<BrokenEventLink[]> {
	const links: BrokenEventLink[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		const eventLink = await readTimelinkEventValue(app, file);
		if (!eventLink) continue;
		const eventFile = resolveEventFile(app, file, eventLink);
		if (!eventFile) continue;
		if (await fileHasFrontmatterProperties(app, eventFile)) continue;
		links.push({ cardFile: file, eventFile });
	}
	return links;
}

async function collectBoardCardNotesWithMissingEventTargets(
	app: CleanupApp,
): Promise<MissingEventTargetCard[]> {
	const cardsByPath = new Map<string, MissingEventTargetCard>();

	for (const boardFile of app.vault.getMarkdownFiles()) {
		const markdown = await app.vault.cachedRead(boardFile);
		if (!isKanbanBoard(markdown)) continue;
		const board = parseKanbanBoard(markdown);

		for (const lane of board.lanes) {
			for (const card of lane.cards) {
				const linkedCardFile = resolveLinkedCardFile(app as never, boardFile.path, card.title);
				if (!isFileLike(linkedCardFile)) continue;
				const eventLink = await readTimelinkEventValue(app, linkedCardFile);
				if (!eventLink) continue;
				const eventPath = extractFirstWikiLinkPath(eventLink);
				if (!eventPath) continue;
				if (resolveEventFile(app, linkedCardFile, eventLink)) continue;
				cardsByPath.set(linkedCardFile.path, { cardFile: linkedCardFile, eventPath });
			}
		}
	}

	return Array.from(cardsByPath.values());
}

function isPathInFolder(path: string, folderPath: string): boolean {
	const normalizeVaultPath = (value: string) =>
		value
			.replace(/\\/g, '/')
			.replace(/\/+/g, '/')
			.replace(/^\/|\/$/g, '');
	const normalizedFolder = normalizeVaultPath(folderPath);
	if (!normalizedFolder) return false;
	return normalizeVaultPath(path).startsWith(`${normalizedFolder}/`);
}

async function collectPropertylessCalendarEvents(
	app: CleanupApp,
	calendarFolderPath: string,
): Promise<CleanupFile[]> {
	const files: CleanupFile[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		if (!isPathInFolder(file.path, calendarFolderPath)) continue;
		if (await fileHasFrontmatterProperties(app, file)) continue;
		files.push(file);
	}
	return files;
}

function getLinkDisplayText(linktext: string, linkedFile: CleanupFile): string {
	const parts = parseWikiLinkParts(linktext);
	if (parts?.alias) return parts.alias;
	return linkedFile.basename;
}

export function unlinkFirstWikiLinkTitle(title: string, linkedFile: CleanupFile): string {
	const { titleLine, rest } = splitCardTitle(title);
	const nextTitleLine = titleLine.replace(/\[\[([^\]]+)\]\]/, (_match, linktext: string) =>
		getLinkDisplayText(linktext, linkedFile),
	);
	return rest ? `${nextTitleLine}\n${rest}` : nextTitleLine;
}

function unlinkCardIfTargeted(
	app: CleanupApp,
	boardFile: CleanupFile,
	targetCardPaths: Set<string>,
	card: KanbanCard,
): { card: KanbanCard; changed: boolean } {
	const linkedCardFile = resolveLinkedCardFile(app as never, boardFile.path, card.title);
	if (!linkedCardFile || !targetCardPaths.has(linkedCardFile.path)) {
		return { card, changed: false };
	}
	const nextTitle = unlinkFirstWikiLinkTitle(card.title, linkedCardFile);
	if (nextTitle === card.title) return { card, changed: false };
	return { card: { ...card, title: nextTitle }, changed: true };
}

function unlinkBoardCardLinks(
	app: CleanupApp,
	boardFile: CleanupFile,
	board: KanbanBoard,
	targetCardPaths: Set<string>,
): { board: KanbanBoard; changedCards: number } {
	let changedCards = 0;
	const lanes = board.lanes.map((lane) => {
		let laneChanged = false;
		const cards = lane.cards.map((card) => {
			const result = unlinkCardIfTargeted(app, boardFile, targetCardPaths, card);
			if (result.changed) {
				laneChanged = true;
				changedCards += 1;
			}
			return result.card;
		});
		return laneChanged ? { ...lane, cards } : lane;
	});
	return changedCards > 0 ? { board: { ...board, lanes }, changedCards } : { board, changedCards };
}

async function clearKanbanCardLinks(
	app: CleanupApp,
	targetCardPaths: Set<string>,
): Promise<{ boardsUpdated: number; cardLinksCleared: number }> {
	let boardsUpdated = 0;
	let cardLinksCleared = 0;

	for (const file of app.vault.getMarkdownFiles()) {
		const markdown = await app.vault.cachedRead(file);
		if (!isKanbanBoard(markdown)) continue;
		const board = parseKanbanBoard(markdown);
		const result = unlinkBoardCardLinks(app, file, board, targetCardPaths);
		if (result.changedCards === 0) continue;
		await app.vault.modify(file, serializeKanbanBoard(result.board, markdown));
		boardsUpdated += 1;
		cardLinksCleared += result.changedCards;
	}

	return { boardsUpdated, cardLinksCleared };
}

async function markdownBodyIsEmpty(app: CleanupApp, file: CleanupFile): Promise<boolean> {
	const markdown = await app.vault.cachedRead(file);
	const normalized = markdown.replace(/\r\n/g, '\n');
	const frontmatterBody = extractFrontmatterBody(normalized);
	if (frontmatterBody === undefined) return normalized.trim().length === 0;
	const frontmatterBlock = normalized.match(/^---\n[\s\S]*?\n---/);
	const body = frontmatterBlock ? normalized.slice(frontmatterBlock[0].length) : normalized;
	return body.trim().length === 0;
}

async function removeCardEventLinks(
	app: CleanupApp,
	cardFiles: CleanupFile[],
): Promise<{ cardNotesDeleted: number; cardEventLinksRemoved: number }> {
	let cardNotesDeleted = 0;
	let cardEventLinksRemoved = 0;

	for (const cardFile of cardFiles) {
		if (await markdownBodyIsEmpty(app, cardFile)) {
			await app.fileManager.trashFile(cardFile);
			cardNotesDeleted += 1;
			continue;
		}
		await removeFrontmatterKey(app, cardFile, TIMELINK_EVENT_KEY);
		cardEventLinksRemoved += 1;
	}

	return { cardNotesDeleted, cardEventLinksRemoved };
}

async function trashFiles(app: CleanupApp, files: CleanupFile[]): Promise<number> {
	for (const file of files) {
		await app.fileManager.trashFile(file);
	}
	return files.length;
}

async function collectEmptyCardPaths(
	app: CleanupApp,
	cardFiles: CleanupFile[],
): Promise<Set<string>> {
	const paths = new Set<string>();
	for (const cardFile of cardFiles) {
		if (await markdownBodyIsEmpty(app, cardFile)) {
			paths.add(cardFile.path);
		}
	}
	return paths;
}

function getBrokenEventCount(
	eventFiles: CleanupFile[],
	missingEventTargetCards: MissingEventTargetCard[],
): number {
	const eventPaths = new Set(eventFiles.map((file) => file.path));
	missingEventTargetCards.forEach((target) => {
		eventPaths.add(target.eventPath.endsWith('.md') ? target.eventPath : `${target.eventPath}.md`);
	});
	return eventPaths.size;
}

async function cleanupMissingTimelinkEventPropertiesForApp(
	app: CleanupApp,
	calendarFolderPath: string,
): Promise<StartupCleanupResult> {
	const calendarEventFiles = await collectPropertylessCalendarEvents(app, calendarFolderPath);
	const calendarEventsDeleted = await trashFiles(app, calendarEventFiles);
	const missingEventTargetCards = await collectBoardCardNotesWithMissingEventTargets(app);
	const brokenLinks = await collectBrokenEventLinks(app);
	const brokenEventFiles = uniqueFiles(brokenLinks.map((link) => link.eventFile));
	const eventFiles = uniqueFiles([...calendarEventFiles, ...brokenEventFiles]);
	if (eventFiles.length === 0 && missingEventTargetCards.length === 0) {
		return { ...EMPTY_RESULT };
	}

	const cardFiles = uniqueFiles([
		...brokenLinks.map((link) => link.cardFile),
		...missingEventTargetCards.map((target) => target.cardFile),
	]);
	const deletedCardPaths = await collectEmptyCardPaths(app, cardFiles);
	const boardCleanup =
		deletedCardPaths.size > 0
			? await clearKanbanCardLinks(app, deletedCardPaths)
			: { boardsUpdated: 0, cardLinksCleared: 0 };
	const cardCleanup =
		cardFiles.length > 0
			? await removeCardEventLinks(app, cardFiles)
			: { cardNotesDeleted: 0, cardEventLinksRemoved: 0 };
	const brokenEventsDeleted = await trashFiles(app, brokenEventFiles);

	return {
		brokenEventLinks: getBrokenEventCount(eventFiles, missingEventTargetCards),
		eventsDeleted: calendarEventsDeleted + brokenEventsDeleted,
		cardNotesDeleted: cardCleanup.cardNotesDeleted,
		cardEventLinksRemoved: cardCleanup.cardEventLinksRemoved,
		kanbanCardLinksCleared: boardCleanup.cardLinksCleared,
		kanbanBoardsUpdated: boardCleanup.boardsUpdated,
	};
}

export async function cleanupMissingTimelinkEventProperties(
	app: App,
	calendarFolderPath: string,
): Promise<StartupCleanupResult> {
	return cleanupMissingTimelinkEventPropertiesForApp(app as never, calendarFolderPath);
}

export function hasStartupCleanupChanges(result: StartupCleanupResult): boolean {
	return (
		result.eventsDeleted > 0 ||
		result.cardNotesDeleted > 0 ||
		result.cardEventLinksRemoved > 0 ||
		result.kanbanCardLinksCleared > 0
	);
}
