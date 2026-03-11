import { MountedItemView } from './mounted-item-view';
import type { App, WorkspaceLeaf } from 'obsidian';

type CalendarProvider<Resource> = {
	getCalendar: () => Resource;
};
type LeafViewState = { file?: string; filePath?: string } | undefined;

function getLeafFilePath(leaf: WorkspaceLeaf): string | null {
	const state = leaf.getViewState().state as LeafViewState;
	const currentFile = (leaf.view as { file?: { path?: string } | null } | undefined)?.file;
	return currentFile?.path ?? state?.file ?? state?.filePath ?? null;
}

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

	private async openNote(path: string): Promise<void> {
		const existingLeaf = this.plugin.app.workspace
			.getLeavesOfType('markdown')
			.find((leaf) => getLeafFilePath(leaf) === path);
		if (existingLeaf) {
			await Promise.resolve(this.plugin.app.workspace.revealLeaf(existingLeaf));
			return;
		}

		await this.plugin.app.workspace.openLinkText(path, '', true);
	}

	protected mountMountedView(containerEl: HTMLElement): void {
		const calendar = this.plugin.calendar?.getCalendar();
		if (!calendar) {
			containerEl.createEl('div', { text: this.getNotReadyText() });
			return;
		}
		this.mountDatedView(containerEl, this.plugin.app, calendar, (path: string) => {
			void this.openNote(path);
		});
	}

	protected unmountMountedView(containerEl: HTMLElement): void {
		this.unmountDatedView(containerEl);
	}
}
