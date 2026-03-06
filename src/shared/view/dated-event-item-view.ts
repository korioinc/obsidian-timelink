import { MountedItemView } from './mounted-item-view';
import type { App, WorkspaceLeaf } from 'obsidian';

type CalendarProvider<Resource> = {
	getCalendar: () => Resource;
};

export type DatedEventItemViewPluginContext<Resource> = {
	app: App;
	calendar?: CalendarProvider<Resource>;
};

export abstract class DatedEventItemView<Resource> extends MountedItemView {
	protected plugin: DatedEventItemViewPluginContext<Resource>;

	constructor(leaf: WorkspaceLeaf, plugin: DatedEventItemViewPluginContext<Resource>) {
		super(leaf);
		this.plugin = plugin;
	}

	protected abstract getNotReadyText(): string;
	protected abstract mountDatedView(
		containerEl: HTMLElement,
		app: App,
		calendar: Resource,
		onOpenNote: (path: string) => void,
	): void;
	protected abstract unmountDatedView(containerEl: HTMLElement): void;

	protected mountMountedView(containerEl: HTMLElement): void {
		const calendar = this.plugin.calendar?.getCalendar();
		if (!calendar) {
			containerEl.createEl('div', { text: this.getNotReadyText() });
			return;
		}
		this.mountDatedView(containerEl, this.plugin.app, calendar, (path: string) => {
			void this.plugin.app.workspace.openLinkText(path, '', true);
		});
	}

	protected unmountMountedView(containerEl: HTMLElement): void {
		this.unmountDatedView(containerEl);
	}
}
