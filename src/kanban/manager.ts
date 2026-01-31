import type TimeLinkPlugin from '../main';
import { KANBAN_VIEW_TYPE } from './constants';
import { buildKanbanBoardMarkdown } from './template';
import { KanbanView } from './view';
import { MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';

export class KanbanManager {
	plugin: TimeLinkPlugin;

	constructor(plugin: TimeLinkPlugin) {
		this.plugin = plugin;
	}

	async createBoard(title: string, folderPath?: string): Promise<TFile> {
		const safeTitle = title.trim();
		const filename = safeTitle.length ? `${safeTitle}.md` : 'Kanban Board.md';
		const basePath = folderPath ? folderPath.replace(/\/$/, '') : '';
		const path = basePath ? `${basePath}/${filename}` : filename;
		const existing = this.plugin.app.vault.getAbstractFileByPath(path);

		if (existing instanceof TFile) {
			return existing;
		}

		const markdown = buildKanbanBoardMarkdown({ title: safeTitle || 'Kanban Board' });
		return this.plugin.app.vault.create(path, markdown);
	}

	async openBoard(file: TFile): Promise<void> {
		const leaf = this.findLeafForFile(file.path) ?? this.plugin.app.workspace.getLeaf(false);
		const baseState = (leaf.view?.getState?.() as Record<string, unknown> | undefined) ?? {};
		await leaf.setViewState({
			type: KANBAN_VIEW_TYPE,
			active: true,
			state: { ...baseState, file: file.path },
		});
	}

	registerView(): void {
		this.plugin.registerView(KANBAN_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			return new KanbanView(leaf, this.plugin);
		});
	}

	private findLeafForFile(filePath: string): WorkspaceLeaf | null {
		const activeLeaf =
			this.plugin.app.workspace.getMostRecentLeaf?.() ?? this.plugin.app.workspace.getLeaf(false);
		if (activeLeaf) {
			const activeView = activeLeaf.view;
			const activeState = activeView?.getState?.() as
				| { file?: string; filePath?: string }
				| undefined;
			const activePath = activeState?.file ?? activeState?.filePath;
			if (activePath === filePath) {
				return activeLeaf;
			}
			if (activeView instanceof MarkdownView && activeView.file?.path === filePath) {
				return activeLeaf;
			}
		}
		const markdownLeaves = this.plugin.app.workspace.getLeavesOfType('markdown');
		for (const leaf of markdownLeaves) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path === filePath) {
				return leaf;
			}
		}
		const leaves = this.plugin.app.workspace.getLeavesOfType(KANBAN_VIEW_TYPE);
		for (const leaf of leaves) {
			const state = leaf?.getViewState?.()?.state as
				| { file?: string; filePath?: string }
				| undefined;
			const existingPath = state?.file ?? state?.filePath;
			if (existingPath === filePath) {
				return leaf;
			}
		}
		return null;
	}
}
