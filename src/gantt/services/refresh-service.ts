import { isPathWithinDepth, isWithinDepth } from '../../kanban-list/utils/path';
import {
	KANBAN_FRONTMATTER_KEY,
	KANBAN_FRONTMATTER_VALUE,
} from '../../shared/frontmatter/kanban-frontmatter';
import { isPathInDirectory } from '../../shared/vault/register-vault-path-refresh';
import type { App, TAbstractFile, TFile } from 'obsidian';

type GanttRefreshEvent = 'create' | 'modify' | 'delete' | 'rename' | 'metadata';

type ShouldRefreshGanttDataParams = {
	app: App;
	file: TAbstractFile;
	event: GanttRefreshEvent;
	oldPath?: string;
	calendarFolderPath: string;
	maxDepth: number;
	dependencyPaths: ReadonlySet<string>;
};

type RegisterGanttDataRefreshParams = {
	app: App;
	calendarFolderPath: string;
	maxDepth: number;
	getDependencyPaths: () => ReadonlySet<string>;
	onReload: () => void;
};

const isFileLike = (file: TAbstractFile): file is TFile => 'basename' in file;

const isKanbanBoardFile = (app: App, file: TAbstractFile, maxDepth: number): boolean => {
	if (!isFileLike(file) || !isWithinDepth(file, maxDepth)) return false;
	return (
		app.metadataCache.getFileCache(file)?.frontmatter?.[KANBAN_FRONTMATTER_KEY] ===
		KANBAN_FRONTMATTER_VALUE
	);
};

export const shouldRefreshGanttData = ({
	app,
	file,
	event,
	oldPath,
	calendarFolderPath,
	maxDepth,
	dependencyPaths,
}: ShouldRefreshGanttDataParams): boolean => {
	if (dependencyPaths.has(file.path)) return true;
	if (oldPath && dependencyPaths.has(oldPath)) return true;
	if (isKanbanBoardFile(app, file, maxDepth)) return true;
	if (event === 'create') {
		return isWithinDepth(file, maxDepth) || isPathInDirectory(file.path, calendarFolderPath);
	}
	if (event === 'rename') {
		return (
			isWithinDepth(file, maxDepth) ||
			isPathWithinDepth(oldPath, maxDepth) ||
			isPathInDirectory(file.path, calendarFolderPath) ||
			Boolean(oldPath && isPathInDirectory(oldPath, calendarFolderPath))
		);
	}
	return false;
};

export const registerGanttDataRefresh = ({
	app,
	calendarFolderPath,
	maxDepth,
	getDependencyPaths,
	onReload,
}: RegisterGanttDataRefreshParams): (() => void) => {
	const triggerReload = (event: GanttRefreshEvent, file: TAbstractFile, oldPath?: string) => {
		if (
			!shouldRefreshGanttData({
				app,
				file,
				event,
				oldPath,
				calendarFolderPath,
				maxDepth,
				dependencyPaths: getDependencyPaths(),
			})
		) {
			return;
		}
		onReload();
	};
	const createRef = app.vault.on('create', (file) => triggerReload('create', file));
	const modifyRef = app.vault.on('modify', (file) => triggerReload('modify', file));
	const deleteRef = app.vault.on('delete', (file) => triggerReload('delete', file));
	const renameRef = app.vault.on('rename', (file, oldPath) =>
		triggerReload('rename', file, oldPath),
	);
	const metadataChangedRef = app.metadataCache.on('changed', (file) =>
		triggerReload('metadata', file),
	);

	return () => {
		app.vault.offref(createRef);
		app.vault.offref(modifyRef);
		app.vault.offref(deleteRef);
		app.vault.offref(renameRef);
		app.metadataCache.offref(metadataChangedRef);
	};
};
