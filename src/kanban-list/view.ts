import type TimeLinkPlugin from '../main';
import { KANBAN_LIST_VIEW_ICON, KANBAN_LIST_VIEW_TYPE } from './constants';
import { mountKanbanListUI, unmountKanbanListUI } from './ui';
import { ItemView, WorkspaceLeaf } from 'obsidian';

export class TimeLinkKanbanListView extends ItemView {
	private plugin: TimeLinkPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: TimeLinkPlugin) {
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

	async onOpen(): Promise<void> {
		await Promise.resolve(super.onOpen());
		const container = this.containerEl.children[1] as HTMLElement | undefined;
		if (!container) {
			return;
		}
		container.empty();
		mountKanbanListUI(container, this.plugin.app, this.plugin);
	}

	async onClose(): Promise<void> {
		await Promise.resolve(super.onClose());
		const container = this.containerEl.children[1] as HTMLElement | undefined;
		if (container) {
			unmountKanbanListUI(container);
		}
	}
}
