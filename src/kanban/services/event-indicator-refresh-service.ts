import type { App, TAbstractFile, TFile } from 'obsidian';

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
	const onChanged = (file: TFile) => {
		if (!shouldRefreshCardEventIndicators(file.path, undefined, getLinkedCardPaths())) return;
		onReload();
	};
	const onDeleted = (file: TFile) => {
		if (!shouldRefreshCardEventIndicators(file.path, undefined, getLinkedCardPaths())) return;
		onReload();
	};
	const onRename = (file: TAbstractFile, oldPath: string) => {
		if (!shouldRefreshCardEventIndicators(file.path, oldPath, getLinkedCardPaths())) return;
		onReload();
	};

	const changedRef = app.metadataCache.on('changed', onChanged);
	const deletedRef = app.metadataCache.on('deleted', onDeleted);
	const renameRef = app.vault.on('rename', onRename);

	return () => {
		app.metadataCache.offref(changedRef);
		app.metadataCache.offref(deletedRef);
		app.vault.offref(renameRef);
	};
};
