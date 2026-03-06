import { KANBAN_VIEW_TYPE } from '../constants';
import { KanbanView, type KanbanViewPluginContext } from '../view';
import { getLeafFilePath } from './leaf-service';
import { buildKanbanBoardMarkdown } from './template-service';
import { TFile, WorkspaceLeaf, type App } from 'obsidian';

type KanbanManagerPluginContext = KanbanViewPluginContext & {
	app: App;
	registerView: (type: string, viewCreator: (leaf: WorkspaceLeaf) => KanbanView) => void;
};

export class KanbanManager {
	plugin: KanbanManagerPluginContext;

	constructor(plugin: KanbanManagerPluginContext) {
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
			if (getLeafFilePath(activeLeaf) === filePath) {
				return activeLeaf;
			}
		}
		const markdownLeaves = this.plugin.app.workspace.getLeavesOfType('markdown');
		for (const leaf of markdownLeaves) {
			if (getLeafFilePath(leaf) === filePath) {
				return leaf;
			}
		}
		const leaves = this.plugin.app.workspace.getLeavesOfType(KANBAN_VIEW_TYPE);
		for (const leaf of leaves) {
			if (getLeafFilePath(leaf) === filePath) {
				return leaf;
			}
		}
		return null;
	}
}
