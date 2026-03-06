import {
	type FrontmatterFileLike,
	type FrontmatterMetadataApp,
	readFrontmatterString,
	readFrontmatterValue,
} from '../../shared/frontmatter/file-frontmatter';
import type { KanbanBoard } from '../types';
import { getFirstWikiLinkPath, splitCardTitle } from '../utils/card-title';
import { getLeafFilePath } from './leaf-service';
import { hasCard, removeCard } from './model-service';
import { isKanbanBoard, parseKanbanBoard, serializeKanbanBoard } from './parser-service';
import type { App, TFile, WorkspaceLeaf } from 'obsidian';

type VaultFileLike = { path: string };
type CardLookupApp = FrontmatterMetadataApp & {
	metadataCache: FrontmatterMetadataApp['metadataCache'] & {
		getFirstLinkpathDest(path: string, sourcePath: string): unknown;
	};
};
type VaultApi = {
	getAbstractFileByPath(path: string): unknown;
	read(file: VaultFileLike): Promise<string>;
	modify(file: VaultFileLike, data: string): Promise<void>;
};

function toVaultFileLike(file: unknown): VaultFileLike | null {
	if (!file || typeof file !== 'object') return null;
	const path = (file as { path?: unknown }).path;
	if (typeof path !== 'string') return null;
	return file as VaultFileLike;
}

function isTFileLike(file: unknown): file is TFile {
	if (!file || typeof file !== 'object') return false;
	const path = (file as { path?: unknown }).path;
	const basename = (file as { basename?: unknown }).basename;
	return typeof path === 'string' && typeof basename === 'string';
}

export function resolveLinkedCardFile(
	app: CardLookupApp,
	sourceFilePath: string,
	title: string,
): TFile | null {
	const { titleLine } = splitCardTitle(title);
	if (!titleLine) return null;
	const linkedPath = getFirstWikiLinkPath(titleLine);
	if (!linkedPath) return null;
	const linkedFile = app.metadataCache.getFirstLinkpathDest(linkedPath, sourceFilePath);
	return isTFileLike(linkedFile) ? linkedFile : null;
}

export function hasCardLinkedEvent(
	app: CardLookupApp,
	sourceFilePath: string,
	title: string,
	cardEventProperty: string,
): boolean {
	const linkedCardFile = resolveLinkedCardFile(app, sourceFilePath, title);
	if (!linkedCardFile) return false;
	return readFrontmatterString(app, linkedCardFile, cardEventProperty) !== null;
}

export function cardFileHasEventLink(
	app: FrontmatterMetadataApp,
	cardFile: FrontmatterFileLike,
	cardEventProperty: string,
): boolean {
	return readFrontmatterString(app, cardFile, cardEventProperty) !== null;
}

export function resolveEventCardBacklinkFromCardTitle(
	app: CardLookupApp,
	sourceFilePath: string,
	title: string,
	cardEventProperty: string,
	eventCardProperty: string,
): string | null {
	const linkedCardFile = resolveLinkedCardFile(app, sourceFilePath, title);
	if (!linkedCardFile) return null;
	const eventLink = readFrontmatterString(app, linkedCardFile, cardEventProperty);
	if (!eventLink) return null;
	const eventPath = getFirstWikiLinkPath(eventLink);
	if (!eventPath) return null;
	const eventFile = app.metadataCache.getFirstLinkpathDest(eventPath, linkedCardFile.path);
	if (!isTFileLike(eventFile)) return null;
	return readFrontmatterString(app, eventFile, eventCardProperty);
}

export function collectLinkedEventFiles(
	app: CardLookupApp,
	board: KanbanBoard,
	sourceFilePath: string,
	cardEventProperty: string,
): Set<TFile> {
	const eventFiles = new Set<TFile>();

	for (const lane of board.lanes) {
		for (const card of lane.cards) {
			const linkedCardFile = resolveLinkedCardFile(app, sourceFilePath, card.title);
			if (!linkedCardFile) continue;
			const eventLinkValue = readFrontmatterValue(app, linkedCardFile, cardEventProperty);
			if (typeof eventLinkValue !== 'string' || !eventLinkValue.trim()) continue;
			const eventPath = getFirstWikiLinkPath(eventLinkValue);
			if (!eventPath) continue;
			const eventFile = app.metadataCache.getFirstLinkpathDest(eventPath, linkedCardFile.path);
			if (isTFileLike(eventFile)) {
				eventFiles.add(eventFile);
			}
		}
	}

	return eventFiles;
}

export async function ensureCardTextFile(
	app: App,
	sourceFilePath: string | undefined,
	titleLine: string,
): Promise<TFile> {
	const cleanedTitle = titleLine.replace(/\[\[|\]\]|\[|\]|\(|\)/g, '').trim() || 'New card';
	const sanitizedTitle = cleanedTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'New card';
	const parent = app.fileManager.getNewFileParent(sourceFilePath ?? '');
	const basePath = parent.path ? `${parent.path}/${sanitizedTitle}.md` : `${sanitizedTitle}.md`;
	const existing = app.vault.getAbstractFileByPath(basePath);
	if (isTFileLike(existing)) return existing;
	const newPath = await app.fileManager.getAvailablePathForAttachment(basePath);
	return app.vault.create(newPath, '');
}

export function findOpenKanbanLeafByPath(
	app: App,
	kanbanViewType: string,
	filePath: string,
): WorkspaceLeaf | null {
	const leaves = app.workspace.getLeavesOfType(kanbanViewType);
	for (const leaf of leaves) {
		if (getLeafFilePath(leaf) === filePath) {
			return leaf;
		}
	}
	return null;
}

export async function removeCardFromBoardFile(
	app: App,
	filePath: string,
	cardId: string,
): Promise<boolean> {
	const vault = app.vault as unknown as VaultApi;
	const sourceFile = toVaultFileLike(vault.getAbstractFileByPath(filePath));
	if (!sourceFile) return false;
	const markdown = await vault.read(sourceFile);
	if (!isKanbanBoard(markdown)) return false;
	const sourceBoard = parseKanbanBoard(markdown);
	if (!hasCard(sourceBoard, cardId)) return false;
	const nextBoard = removeCard(sourceBoard, cardId);
	const serialized = serializeKanbanBoard(nextBoard, markdown);
	await vault.modify(sourceFile, serialized);
	return true;
}
