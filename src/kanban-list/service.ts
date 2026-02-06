import { normalizeHexColor } from '../calendar/utils/month-calendar-utils';
import { KANBAN_FRONTMATTER_KEY } from '../kanban/constants';
import { KANBAN_LIST_MAX_DEPTH } from './constants';
import type { KanbanListItem } from './types';
import { App, TFile } from 'obsidian';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---/;
const KANBAN_BOARD_COLOR_KEY = 'kanban-color';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasKanbanFrontmatterKey = (frontmatterBody: string): boolean => {
	const keyPattern = new RegExp(`^\\s*${escapeRegExp(KANBAN_FRONTMATTER_KEY)}\\s*:`, 'm');
	return keyPattern.test(frontmatterBody);
};

const getFolderDepth = (folderPath: string): number => {
	if (!folderPath.trim()) return 0;
	return folderPath.split('/').filter(Boolean).length;
};

const hasKanbanFromCache = (app: App, file: TFile): boolean | null => {
	const cache = app.metadataCache.getFileCache(file);
	if (!cache) return null;
	return Boolean(cache.frontmatter?.[KANBAN_FRONTMATTER_KEY]);
};

const parseFrontmatterValue = (frontmatterBody: string, key: string): string | undefined => {
	const keyPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*:\\s*(.+?)\\s*$`, 'm');
	const match = frontmatterBody.match(keyPattern);
	if (!match?.[1]) return undefined;
	let value = match[1].trim();
	const quoted =
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"));
	if (quoted && value.length >= 2) {
		value = value.slice(1, -1).trim();
	}
	return value || undefined;
};

const getKanbanColorFromCache = (app: App, file: TFile): string | undefined => {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.[KANBAN_BOARD_COLOR_KEY];
	if (typeof raw !== 'string') return undefined;
	return normalizeHexColor(raw) ?? undefined;
};

type FrontmatterScanResult = {
	hasKanban: boolean;
	kanbanColor?: string;
};

const scanFrontmatterFromFile = async (app: App, file: TFile): Promise<FrontmatterScanResult> => {
	const raw = await app.vault.cachedRead(file);
	const normalized = raw.replace(/\r\n/g, '\n');
	const frontmatterMatch = normalized.match(FRONTMATTER_PATTERN);
	if (!frontmatterMatch?.[1]) {
		return { hasKanban: false };
	}
	const frontmatterBody = frontmatterMatch[1];
	const colorValue = parseFrontmatterValue(frontmatterBody, KANBAN_BOARD_COLOR_KEY);
	return {
		hasKanban: hasKanbanFrontmatterKey(frontmatterBody),
		kanbanColor: colorValue ? (normalizeHexColor(colorValue) ?? undefined) : undefined,
	};
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
	const candidates = files.filter((file) => {
		const folderPath = file.parent?.path ?? '';
		return getFolderDepth(folderPath) <= maxDepth;
	});

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
		const folderPath = file.parent?.path ?? '';
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
