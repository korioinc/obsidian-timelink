import type { KanbanBoard } from '../types';
import { resolveLinkedCardFile } from './card-service';
import type { App } from 'obsidian';

export const buildLinkedCardPathSet = (
	app: App,
	board: KanbanBoard | null,
	sourceFilePath: string | null,
): Set<string> => {
	const linkedPaths = new Set<string>();
	if (!board || !sourceFilePath) return linkedPaths;

	for (const lane of board.lanes) {
		for (const card of lane.cards) {
			const linkedCardFile = resolveLinkedCardFile(app, sourceFilePath, card.title);
			if (!linkedCardFile) continue;
			linkedPaths.add(linkedCardFile.path);
		}
	}

	return linkedPaths;
};

export const shouldRefreshCardEventIndicators = (
	filePath: string | null | undefined,
	oldPath: string | null | undefined,
	linkedCardPaths: ReadonlySet<string>,
): boolean => {
	if (filePath && linkedCardPaths.has(filePath)) return true;
	if (oldPath && linkedCardPaths.has(oldPath)) return true;
	return false;
};

export const registerKanbanCardEventIndicatorRefresh = (
	app: App,
	getLinkedCardPaths: () => ReadonlySet<string>,
	onReload: () => void,
): (() => void) => {
	const onChanged = (file: { path: string }) => {
		if (!shouldRefreshCardEventIndicators(file.path, undefined, getLinkedCardPaths())) return;
		onReload();
	};
	const onDeleted = (file: { path: string }) => {
		if (!shouldRefreshCardEventIndicators(file.path, undefined, getLinkedCardPaths())) return;
		onReload();
	};
	const onRename = (file: { path: string }, oldPath: string) => {
		if (!shouldRefreshCardEventIndicators(file.path, oldPath, getLinkedCardPaths())) return;
		onReload();
	};

	app.metadataCache.on('changed', onChanged);
	app.metadataCache.on('deleted', onDeleted);
	app.vault.on('rename', onRename);

	return () => {
		app.metadataCache.off('changed', onChanged);
		app.metadataCache.off('deleted', onDeleted);
		app.vault.off('rename', onRename);
	};
};
