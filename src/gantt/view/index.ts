import { MountedItemView } from '../../shared/view/mounted-item-view';
import { GANTT_VIEW_ICON, GANTT_VIEW_TYPE } from '../constants';
import type { GanttPluginContext } from '../types';
import { mountGanttUI, unmountGanttUI } from '../view';
import { WorkspaceLeaf } from 'obsidian';

export class TimeLinkGanttView extends MountedItemView {
	private plugin: GanttPluginContext;

	constructor(leaf: WorkspaceLeaf, plugin: GanttPluginContext) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return GANTT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Gantt';
	}

	getIcon(): string {
		return GANTT_VIEW_ICON;
	}

	protected mountMountedView(container: HTMLElement): void {
		mountGanttUI(container, this.plugin);
	}

	protected unmountMountedView(containerEl: HTMLElement): void {
		unmountGanttUI(containerEl);
	}
}
