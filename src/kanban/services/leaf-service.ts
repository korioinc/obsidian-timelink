import type { WorkspaceLeaf } from 'obsidian';

type LeafViewState = { file?: string; filePath?: string } | undefined;

export function getLeafFilePath(leaf: WorkspaceLeaf): string | null {
	const state = leaf.getViewState().state as LeafViewState;
	const currentFile = (leaf.view as { file?: { path?: string } | null } | undefined)?.file;
	return currentFile?.path ?? state?.file ?? state?.filePath ?? null;
}
