import {
	KANBAN_FRONTMATTER_KEY,
	KANBAN_FRONTMATTER_VALUE,
} from '../../shared/frontmatter/kanban-frontmatter';
import { registerVaultRefresh } from '../../shared/vault/register-vault-refresh';
import { getFolderDepth, isWithinDepth } from '../utils/path';
import type { App, TAbstractFile, TFile } from 'obsidian';

type ShouldRefreshKanbanListParams = {
	app: App;
	file: TAbstractFile;
	oldPath?: string;
	maxDepth: number;
	boardPaths: ReadonlySet<string>;
};

type RegisterKanbanListRefreshParams = {
	app: App;
	maxDepth: number;
	getBoardPaths: () => ReadonlySet<string>;
	onReload: () => void;
};

const isFileLike = (file: TAbstractFile): file is TFile => 'basename' in file;

const isDiscoveredBoard = (app: App, file: TAbstractFile, maxDepth: number): boolean => {
	if (!isFileLike(file) || !isWithinDepth(file, maxDepth)) return false;
	return (
		app.metadataCache.getFileCache(file)?.frontmatter?.[KANBAN_FRONTMATTER_KEY] ===
		KANBAN_FRONTMATTER_VALUE
	);
};

export const shouldRefreshKanbanList = ({
	app,
	file,
	oldPath,
	maxDepth,
	boardPaths,
}: ShouldRefreshKanbanListParams): boolean => {
	if (boardPaths.has(file.path)) return true;
	if (oldPath && boardPaths.has(oldPath)) return true;
	if (!isFileLike(file)) {
		return (
			getFolderDepth(file.path) <= maxDepth ||
			Boolean(oldPath && getFolderDepth(oldPath) <= maxDepth)
		);
	}
	return isDiscoveredBoard(app, file, maxDepth);
};

export const registerKanbanListRefresh = ({
	app,
	maxDepth,
	getBoardPaths,
	onReload,
}: RegisterKanbanListRefreshParams): (() => void) => {
	const shouldRefresh = (file: TAbstractFile, oldPath?: string): boolean =>
		shouldRefreshKanbanList({
			app,
			file,
			oldPath,
			maxDepth,
			boardPaths: getBoardPaths(),
		});
	const unregisterVaultRefresh = registerVaultRefresh(app.vault, shouldRefresh, onReload);
	const metadataChangedRef = app.metadataCache.on('changed', (file) => {
		if (shouldRefresh(file)) onReload();
	});

	return () => {
		unregisterVaultRefresh();
		app.metadataCache.offref(metadataChangedRef);
	};
};
