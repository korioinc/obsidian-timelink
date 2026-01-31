import { Modal, App } from 'obsidian';
import type { ComponentChild } from 'preact';
import { render } from 'preact';

type RenderCallback = (close: () => void) => ComponentChild | Promise<ComponentChild>;

export class PreactModal extends Modal {
	private onOpenCallback: RenderCallback;
	private contentElRef: HTMLElement | null = null;

	constructor(app: App, onOpenCallback: RenderCallback) {
		super(app);
		this.onOpenCallback = onOpenCallback;
	}

	async onOpen() {
		const { contentEl } = this;
		this.contentElRef = contentEl;
		const node = await this.onOpenCallback(() => this.close());
		render(node, contentEl);
	}

	onClose() {
		const { contentEl } = this;
		render(null, contentEl);
		this.contentElRef = null;
	}

	renderNode(node: ComponentChild) {
		if (!this.contentElRef) return;
		render(node, this.contentElRef);
	}
}
