import type TimeLinkPlugin from '../main';
import { TIMELINE_VIEW_ICON, TIMELINE_VIEW_TYPE } from './constants';
import { mountTimelineUI, unmountTimelineUI } from './ui';
import { ItemView, WorkspaceLeaf } from 'obsidian';

export class TimeLinkTimelineView extends ItemView {
	private plugin: TimeLinkPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: TimeLinkPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TIMELINE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Timeline';
	}

	getIcon(): string {
		return TIMELINE_VIEW_ICON;
	}

	async onOpen(): Promise<void> {
		await super.onOpen();
		const container = this.containerEl.children[1] as HTMLElement | undefined;
		if (!container) {
			return;
		}
		container.empty();
		const calendar = this.plugin.calendar?.getCalendar();
		if (!calendar) {
			container.createEl('div', { text: 'Timeline not ready.' });
			return;
		}
		mountTimelineUI(container, this.plugin.app, calendar, (path) => {
			void this.plugin.app.workspace.openLinkText(path, '', true);
		});
	}

	async onClose(): Promise<void> {
		await super.onClose();
		const container = this.containerEl.children[1] as HTMLElement | undefined;
		if (container) {
			unmountTimelineUI(container);
		}
	}
}
