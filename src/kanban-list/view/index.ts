import { MountedItemView } from '../../shared/view/mounted-item-view';
import { KANBAN_LIST_VIEW_ICON, KANBAN_LIST_VIEW_TYPE } from '../constants';
import type { KanbanListPluginContext } from '../types';
import { mountKanbanListUI, unmountKanbanListUI } from '../view';
import { WorkspaceLeaf } from 'obsidian';

export class TimeLinkKanbanListView extends MountedItemView {
	private plugin: KanbanListPluginContext;

	constructor(leaf: WorkspaceLeaf, plugin: KanbanListPluginContext) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return KANBAN_LIST_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Kanban list';
	}

	getIcon(): string {
		return KANBAN_LIST_VIEW_ICON;
	}

	protected mountMountedView(container: HTMLElement): void {
		mountKanbanListUI(container, this.plugin);
	}

	protected unmountMountedView(containerEl: HTMLElement): void {
		unmountKanbanListUI(containerEl);
	}
}
