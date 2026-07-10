import { normalizeHexColor } from '../../shared/color/normalize-hex-color';
import {
	KANBAN_BOARD_COLOR_KEY,
	KANBAN_FRONTMATTER_KEY,
	KANBAN_FRONTMATTER_VALUE,
	scanKanbanBoardFrontmatter,
} from '../../shared/frontmatter/kanban-frontmatter';
import { mapWithConcurrency } from '../../shared/utils/map-with-concurrency';
import { KANBAN_LIST_MAX_DEPTH } from '../constants';
import type { KanbanListItem } from '../types';
import { getFolderDepth, getFolderPath, isWithinDepth } from '../utils/path';

type KanbanCollectionFile = {
	path: string;
	basename: string;
	parent: { path: string } | null;
	stat: { mtime: number };
};

export type KanbanCollectionApp = {
	vault: {
		getMarkdownFiles(): KanbanCollectionFile[];
		cachedRead(file: KanbanCollectionFile): Promise<string>;
	};
	metadataCache: {
		getFileCache(file: KanbanCollectionFile): { frontmatter?: Record<string, unknown> } | null;
	};
};

type FrontmatterScanResult = {
	hasKanban: boolean;
	kanbanColor?: string;
};

const readFrontmatterFromCache = (
	cache: { frontmatter?: Record<string, unknown> } | null,
): FrontmatterScanResult | null => {
	if (!cache) return null;
	const marker = cache.frontmatter?.[KANBAN_FRONTMATTER_KEY];
	const color = cache.frontmatter?.[KANBAN_BOARD_COLOR_KEY];
	return {
		hasKanban: typeof marker === 'string' && marker.trim() === KANBAN_FRONTMATTER_VALUE,
		kanbanColor: typeof color === 'string' ? (normalizeHexColor(color) ?? undefined) : undefined,
	};
};

const scanFrontmatterFromFile = async (
	app: KanbanCollectionApp,
	file: KanbanCollectionFile,
): Promise<FrontmatterScanResult> => {
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
	app: KanbanCollectionApp,
	maxDepth = KANBAN_LIST_MAX_DEPTH,
): Promise<KanbanListItem[]> => {
	const files = app.vault.getMarkdownFiles();
	const candidates = files.filter((file) => isWithinDepth(file, maxDepth));

	const resolvedItems = await mapWithConcurrency(
		candidates,
		16,
		async (file): Promise<KanbanListItem | null> => {
			const cached = readFrontmatterFromCache(app.metadataCache.getFileCache(file));
			const metadata = cached ?? (await scanFrontmatterFromFile(app, file));
			if (!metadata.hasKanban) return null;

			const folderPath = getFolderPath(file);
			return {
				path: file.path,
				basename: file.basename,
				folderPath,
				folderDepth: getFolderDepth(folderPath),
				mtime: file.stat.mtime,
				kanbanColor: metadata.kanbanColor,
			};
		},
	);
	const items = resolvedItems.filter((item): item is KanbanListItem => item !== null);

	return items.sort(compareKanbanItems);
};
