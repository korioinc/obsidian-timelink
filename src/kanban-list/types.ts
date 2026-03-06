import type { App, TFile } from 'obsidian';

export interface KanbanListItem {
	path: string;
	basename: string;
	folderPath: string;
	folderDepth: number;
	mtime: number;
	kanbanColor?: string;
}

export type KanbanListPluginContext = {
	app: App;
	kanbanManager: {
		openBoard: (file: TFile) => Promise<void>;
	};
};
