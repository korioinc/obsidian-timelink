import type { App, TFile, WorkspaceLeaf } from 'obsidian';

type LeafViewState = { file?: string; filePath?: string } | undefined;
type OpenableFile = TFile & { path: string };

function getLeafFilePath(leaf: WorkspaceLeaf): string | null {
	const state = leaf.getViewState().state as LeafViewState;
	const currentFile = (leaf.view as { file?: TFile | null } | undefined)?.file;
	return currentFile?.path ?? state?.file ?? state?.filePath ?? null;
}

function isFileLike(value: unknown): value is OpenableFile {
	if (!value || typeof value !== 'object') return false;
	return typeof (value as { path?: unknown }).path === 'string';
}

export async function openNoteInWorkspace(
	app: Pick<App, 'workspace' | 'vault'>,
	path: string,
): Promise<void> {
	const existingLeaf = app.workspace
		.getLeavesOfType('markdown')
		.find((leaf) => getLeafFilePath(leaf) === path);
	if (existingLeaf) {
		await Promise.resolve(app.workspace.revealLeaf(existingLeaf));
		app.workspace.setActiveLeaf?.(existingLeaf, { focus: true });
		return;
	}

	const targetFile = app.vault.getAbstractFileByPath(path);
	const nextLeaf = app.workspace.getLeaf('tab') ?? app.workspace.getLeaf(false);
	if (nextLeaf && isFileLike(targetFile)) {
		await nextLeaf.openFile(targetFile, { active: true });
		await Promise.resolve(app.workspace.revealLeaf(nextLeaf));
		app.workspace.setActiveLeaf?.(nextLeaf, { focus: true });
		return;
	}

	await Promise.resolve(app.workspace.openLinkText(path, '', true));
}
