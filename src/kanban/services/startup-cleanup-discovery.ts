import {
	KANBAN_FRONTMATTER_KEY,
	KANBAN_FRONTMATTER_VALUE,
} from '../../shared/frontmatter/kanban-frontmatter';
import {
	extractFrontmatterBody,
	parseFrontmatterValue,
} from '../../shared/frontmatter/markdown-frontmatter';
import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import { mapWithConcurrency } from '../../shared/utils/map-with-concurrency';
import { extractFirstWikiLinkPath } from '../../shared/utils/wiki-link';
import type { KanbanBoard } from '../types';
import { resolveLinkedCardFile } from './card-service';
import { isKanbanBoard, parseKanbanBoard } from './parser-service';

export type CleanupFile = {
	path: string;
	basename: string;
};

export type CleanupApp = {
	vault: {
		getMarkdownFiles(): CleanupFile[];
		getAbstractFileByPath(path: string): unknown;
		cachedRead(file: CleanupFile): Promise<string>;
		read(file: CleanupFile): Promise<string>;
		modify(file: CleanupFile, data: string): Promise<void>;
	};
	metadataCache: {
		getFileCache(file: CleanupFile): { frontmatter?: Record<string, unknown> } | null;
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
	eventPath: string;
	eventFileToDelete: CleanupFile | null;
};

type MissingEventTargetCard = {
	cardFile: CleanupFile;
	eventPath: string;
};

export type CleanupBoardSource = {
	file: CleanupFile;
	markdown: string;
	board: KanbanBoard;
};

type ReadMarkdown = (file: CleanupFile) => Promise<string>;

const createCachedMarkdownReader = (app: CleanupApp): ReadMarkdown => {
	const readsByPath = new Map<string, Promise<string>>();
	return (file) => {
		const existing = readsByPath.get(file.path);
		if (existing) return existing;
		const read = app.vault.cachedRead(file);
		readsByPath.set(file.path, read);
		return read;
	};
};

function isFileLike(file: unknown): file is CleanupFile {
	if (!file || typeof file !== 'object') return false;
	const path = (file as { path?: unknown }).path;
	const basename = (file as { basename?: unknown }).basename;
	return typeof path === 'string' && typeof basename === 'string';
}

async function readFrontmatterBody(
	readMarkdown: ReadMarkdown,
	file: CleanupFile,
): Promise<string | undefined> {
	const markdown = await readMarkdown(file);
	return extractFrontmatterBody(markdown);
}

async function readTimelinkEventValue(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	file: CleanupFile,
): Promise<string | null> {
	const cache = app.metadataCache.getFileCache(file);
	const cachedFrontmatter = cache?.frontmatter;
	const cachedValue = cachedFrontmatter?.[TIMELINK_EVENT_KEY];
	if (typeof cachedValue === 'string' && cachedValue.trim()) {
		return cachedValue.trim();
	}
	if (cache) return null;
	const frontmatterBody = await readFrontmatterBody(readMarkdown, file);
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

async function classifyBrokenEventFile(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	file: CleanupFile,
): Promise<'valid-event' | 'delete-empty' | 'preserve-content'> {
	const cache = app.metadataCache.getFileCache(file);
	const cachedFrontmatter = cache?.frontmatter;
	if (cachedFrontmatter && Object.keys(cachedFrontmatter).length > 0) return 'valid-event';

	const markdown = await readMarkdown(file);
	if (!cache && extractFrontmatterBody(markdown)?.trim()) return 'valid-event';
	return markdown.trim() ? 'preserve-content' : 'delete-empty';
}

async function collectBrokenEventLinks(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	markdownFiles: CleanupFile[],
): Promise<BrokenEventLink[]> {
	const links = await mapWithConcurrency(
		markdownFiles,
		16,
		async (file): Promise<BrokenEventLink | null> => {
			const eventLink = await readTimelinkEventValue(app, readMarkdown, file);
			if (!eventLink) return null;
			const eventFile = resolveEventFile(app, file, eventLink);
			if (!eventFile) return null;
			const classification = await classifyBrokenEventFile(app, readMarkdown, eventFile);
			if (classification === 'valid-event') return null;
			return {
				cardFile: file,
				eventPath: eventFile.path,
				eventFileToDelete: classification === 'delete-empty' ? eventFile : null,
			};
		},
	);
	return links.filter((link): link is BrokenEventLink => link !== null);
}

async function collectKanbanBoardSources(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	markdownFiles: CleanupFile[],
): Promise<CleanupBoardSource[]> {
	const sources = await mapWithConcurrency(
		markdownFiles,
		16,
		async (file): Promise<CleanupBoardSource | null> => {
			const cache = app.metadataCache.getFileCache(file);
			const cachedMarker = cache?.frontmatter?.[KANBAN_FRONTMATTER_KEY];
			if (cache && cachedMarker !== KANBAN_FRONTMATTER_VALUE) return null;

			const markdown = await readMarkdown(file);
			if (!isKanbanBoard(markdown)) return null;
			return { file, markdown, board: parseKanbanBoard(markdown) };
		},
	);
	return sources.filter((source): source is CleanupBoardSource => source !== null);
}

async function collectBoardCardNotesWithMissingEventTargets(
	app: CleanupApp,
	readMarkdown: ReadMarkdown,
	boardSources: CleanupBoardSource[],
): Promise<MissingEventTargetCard[]> {
	const cardFilesByPath = new Map<string, CleanupFile>();

	for (const { file: boardFile, board } of boardSources) {
		for (const lane of board.lanes) {
			for (const card of lane.cards) {
				const linkedCardFile = resolveLinkedCardFile(app, boardFile.path, card.title);
				if (!isFileLike(linkedCardFile)) continue;
				cardFilesByPath.set(linkedCardFile.path, linkedCardFile);
			}
		}
	}

	const targets = await mapWithConcurrency(
		Array.from(cardFilesByPath.values()),
		16,
		async (cardFile): Promise<MissingEventTargetCard | null> => {
			const eventLink = await readTimelinkEventValue(app, readMarkdown, cardFile);
			if (!eventLink) return null;
			const eventPath = extractFirstWikiLinkPath(eventLink);
			if (!eventPath || resolveEventFile(app, cardFile, eventLink)) return null;
			return { cardFile, eventPath };
		},
	);
	return targets.filter((target): target is MissingEventTargetCard => target !== null);
}

export function isDisposableCardMarkdown(markdown: string): boolean {
	const normalized = markdown.replace(/\r\n/g, '\n');
	const frontmatterBody = extractFrontmatterBody(normalized);
	if (frontmatterBody === undefined) return normalized.trim().length === 0;
	const frontmatterBlock = normalized.match(/^---\n[\s\S]*?\n---/);
	const body = frontmatterBlock ? normalized.slice(frontmatterBlock[0].length) : normalized;
	if (body.trim()) return false;

	const frontmatterKeys: string[] = [];
	for (const line of frontmatterBody.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const keyMatch = /^([A-Za-z0-9_-]+)\s*:/.exec(line);
		if (!keyMatch?.[1]) return false;
		frontmatterKeys.push(keyMatch[1]);
	}
	return frontmatterKeys.length === 1 && frontmatterKeys[0] === TIMELINK_EVENT_KEY;
}

async function cardNoteIsDisposable(
	readMarkdown: ReadMarkdown,
	file: CleanupFile,
): Promise<boolean> {
	return isDisposableCardMarkdown(await readMarkdown(file));
}

export async function collectEmptyCardPaths(
	readMarkdown: ReadMarkdown,
	cardFiles: CleanupFile[],
): Promise<Set<string>> {
	const results = await mapWithConcurrency(cardFiles, 16, async (cardFile) => ({
		cardFile,
		isEmpty: await cardNoteIsDisposable(readMarkdown, cardFile),
	}));
	return new Set(results.filter((result) => result.isEmpty).map((result) => result.cardFile.path));
}

export async function discoverStartupCleanupCandidates(app: CleanupApp) {
	const readMarkdown = createCachedMarkdownReader(app);
	const markdownFiles = app.vault.getMarkdownFiles();
	const brokenLinksPromise = collectBrokenEventLinks(app, readMarkdown, markdownFiles);
	const boardSources = await collectKanbanBoardSources(app, readMarkdown, markdownFiles);
	const [missingEventTargetCards, brokenLinks] = await Promise.all([
		collectBoardCardNotesWithMissingEventTargets(app, readMarkdown, boardSources),
		brokenLinksPromise,
	]);
	return { readMarkdown, boardSources, missingEventTargetCards, brokenLinks };
}
