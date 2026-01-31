import { openCreateKanbanModal } from '../kanban/modal';
import { KanbanView } from '../kanban/view';
import type TimeLinkPlugin from '../main';
import { Notice, TFile } from 'obsidian';

function getActiveKanbanView(plugin: TimeLinkPlugin): KanbanView | null {
	const activeLeaf =
		plugin.app.workspace.getMostRecentLeaf?.() ?? plugin.app.workspace.getLeaf(false);
	const activeView = activeLeaf?.view;
	if (activeView instanceof KanbanView) return activeView;
	const view = plugin.app.workspace.getActiveViewOfType(KanbanView);
	if (view) return view;
	const leaves = plugin.app.workspace.getLeavesOfType('timelink-kanban');
	const leafView = leaves[0]?.view;
	return leafView instanceof KanbanView ? leafView : null;
}

export function registerKanbanCommands(plugin: TimeLinkPlugin): void {
	plugin.addCommand({
		id: 'create-kanban-board',
		name: 'Create kanban board',
		callback: async () => {
			if (!plugin.settings.enableKanban) {
				new Notice('Kanban is disabled in settings.');
				return;
			}
			openCreateKanbanModal(plugin);
		},
	});

	plugin.addCommand({
		id: 'open-active-kanban-board',
		name: 'Open active kanban board',
		checkCallback: (checking) => {
			if (!plugin.settings.enableKanban) return false;
			const file = plugin.app.workspace.getActiveFile();
			if (!(file instanceof TFile)) return false;
			if (!file.path.endsWith('.md')) return false;
			if (checking) return true;
			void plugin.kanbanManager.openBoard(file);
			return true;
		},
	});

	plugin.addCommand({
		id: 'add-kanban-list',
		name: 'Add a list',
		checkCallback: (checking) => {
			if (!plugin.settings.enableKanban) return false;
			const view = getActiveKanbanView(plugin);
			if (!view) return false;
			if (checking) return true;
			view.openAddLaneForm();
			return true;
		},
	});
}
