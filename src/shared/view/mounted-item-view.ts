import { prepareItemViewContentContainer, withItemViewContentUnmount } from './item-view-container';
import { ViewRenderLifecycle } from './view-render-lifecycle';
import { ItemView, type WorkspaceLeaf } from 'obsidian';

export abstract class MountedItemView extends ItemView {
	private readonly mountLifecycle = new ViewRenderLifecycle();
	private mountedContainer: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	protected abstract mountMountedView(containerEl: HTMLElement): void;
	protected abstract unmountMountedView(containerEl: HTMLElement): void;

	async onOpen(): Promise<void> {
		const generation = this.mountLifecycle.beginOpen();
		await Promise.resolve(super.onOpen());
		if (!this.mountLifecycle.canRender(generation)) return;
		if (this.mountedContainer) {
			this.unmountMountedView(this.mountedContainer);
			this.mountedContainer = null;
		}
		const container = prepareItemViewContentContainer(this.containerEl);
		if (!container) return;
		this.mountMountedView(container);
		this.mountedContainer = container;
	}

	async onClose(): Promise<void> {
		const generation = this.mountLifecycle.beginClose();
		await Promise.resolve(super.onClose());
		if (!this.mountLifecycle.canUnmount(generation)) return;
		if (this.mountedContainer) {
			this.unmountMountedView(this.mountedContainer);
			this.mountedContainer = null;
			return;
		}
		withItemViewContentUnmount(this.containerEl, (container) => this.unmountMountedView(container));
	}
}
