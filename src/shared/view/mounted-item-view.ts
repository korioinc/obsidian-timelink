import { prepareItemViewContentContainer, withItemViewContentUnmount } from './item-view-container';
import { ItemView, type WorkspaceLeaf } from 'obsidian';

export abstract class MountedItemView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	protected abstract mountMountedView(containerEl: HTMLElement): void;
	protected abstract unmountMountedView(containerEl: HTMLElement): void;

	async onOpen(): Promise<void> {
		await Promise.resolve(super.onOpen());
		const container = prepareItemViewContentContainer(this.containerEl);
		if (!container) return;
		this.mountMountedView(container);
	}

	async onClose(): Promise<void> {
		await Promise.resolve(super.onClose());
		withItemViewContentUnmount(this.containerEl, (container) => this.unmountMountedView(container));
	}
}
