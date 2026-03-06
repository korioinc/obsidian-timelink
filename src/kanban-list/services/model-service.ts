import { normalizeHexColor } from '../../shared/color/normalize-hex-color';
import {
	readFrontmatterString,
	readFrontmatterValue,
} from '../../shared/frontmatter/file-frontmatter';
import {
	KANBAN_BOARD_COLOR_KEY,
	KANBAN_FRONTMATTER_KEY,
	scanKanbanBoardFrontmatter,
} from '../../shared/frontmatter/kanban-frontmatter';
import { KANBAN_LIST_MAX_DEPTH } from '../constants';
import type { KanbanListItem } from '../types';
import { getFolderDepth, getFolderPath, isWithinDepth } from '../utils/path';
import { App, TFile } from 'obsidian';

const hasKanbanFromCache = (app: App, file: TFile): boolean | null => {
	const cache = app.metadataCache.getFileCache(file);
	if (!cache) return null;
	return Boolean(readFrontmatterValue(app, file, KANBAN_FRONTMATTER_KEY));
};

const getKanbanColorFromCache = (app: App, file: TFile): string | undefined => {
	const color = readFrontmatterString(app, file, KANBAN_BOARD_COLOR_KEY);
	if (!color) return undefined;
	return normalizeHexColor(color) ?? undefined;
};

type FrontmatterScanResult = {
	hasKanban: boolean;
	kanbanColor?: string;
};

const scanFrontmatterFromFile = async (app: App, file: TFile): Promise<FrontmatterScanResult> => {
	const raw = await app.vault.cachedRead(file);
	return scanKanbanBoardFrontmatter(raw);
};

const compareKanbanItems = (left: KanbanListItem, right: KanbanListItem): number => {
	if (left.mtime !== right.mtime) {
		return right.mtime - left.mtime;
	}
	return left.path.localeCompare(right.path);
};

export const collectKanbanBoards = async (
	app: App,
	maxDepth = KANBAN_LIST_MAX_DEPTH,
): Promise<KanbanListItem[]> => {
	const files = app.vault.getMarkdownFiles();
	const candidates = files.filter((file) => isWithinDepth(file, maxDepth));

	const items: KanbanListItem[] = [];
	for (const file of candidates) {
		const cachedValue = hasKanbanFromCache(app, file);
		let fallbackColor: string | undefined;
		let isKanbanFile = false;
		if (cachedValue === null) {
			const fallbackScan = await scanFrontmatterFromFile(app, file);
			isKanbanFile = fallbackScan.hasKanban;
			fallbackColor = fallbackScan.kanbanColor;
		} else {
			isKanbanFile = cachedValue;
		}
		if (!isKanbanFile) continue;
		const folderPath = getFolderPath(file);
		const kanbanColor = getKanbanColorFromCache(app, file) ?? fallbackColor;
		items.push({
			path: file.path,
			basename: file.basename,
			folderPath,
			folderDepth: getFolderDepth(folderPath),
			mtime: file.stat.mtime,
			kanbanColor,
		});
	}

	return items.sort(compareKanbanItems);
};
