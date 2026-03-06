import type { App } from 'obsidian';
import { Menu, Modal, Notice } from 'obsidian';

type ApprovalResult = (value: boolean) => void;

class ApprovalModal extends Modal {
	private message: string;
	private onResolve: ApprovalResult;

	constructor(app: App, message: string, onResolve: ApprovalResult) {
		super(app);
		this.message = message;
		this.onResolve = onResolve;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('p', { text: this.message });
		const actions = contentEl.createDiv({ cls: 'modal-button-container' });
		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.onResolve(false);
			this.close();
		});
		const approveButton = actions.createEl('button', { text: 'Confirm', cls: 'mod-cta' });
		approveButton.addEventListener('click', () => {
			this.onResolve(true);
			this.close();
		});
	}

	onClose(): void {
		this.onResolve(false);
		this.contentEl.empty();
	}
}

export function requestApproval(app: App, message: string): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const modal = new ApprovalModal(app, message, resolve);
		modal.open();
	});
}

type CardMenuCallbacks = {
	onStartEdit: (cardId: string, title: string) => void;
	onCreateNoteFromCard: (cardId: string) => void;
	onCopyCardLink: (cardId: string) => void;
	onCreateEventFromCard: (cardId: string) => void;
	onRemoveCard: (cardId: string) => Promise<void>;
};

type ShowCardMenuParams = CardMenuCallbacks & {
	app: App;
	event: MouseEvent;
	cardId: string;
	title: string;
};

export function showCardMenu(params: ShowCardMenuParams): void {
	const {
		app,
		event,
		cardId,
		title,
		onStartEdit,
		onCreateNoteFromCard,
		onCopyCardLink,
		onCreateEventFromCard,
		onRemoveCard,
	} = params;
	event.preventDefault();
	event.stopPropagation();
	const menu = new Menu();
	menu.addItem((item) => {
		item.setTitle('Edit card').onClick(() => {
			onStartEdit(cardId, title);
		});
	});
	menu.addItem((item) => {
		item.setTitle('New note from card').onClick(() => {
			onCreateNoteFromCard(cardId);
		});
	});
	menu.addItem((item) => {
		item.setTitle('Copy link to card').onClick(() => {
			onCopyCardLink(cardId);
			new Notice('Card link copied to clipboard.');
		});
	});
	menu.addItem((item) => {
		item.setTitle('Create event from card').onClick(() => {
			onCreateEventFromCard(cardId);
		});
	});
	menu.addSeparator();
	menu.addItem((item) => {
		item.setTitle('Delete card').onClick(() => {
			void (async () => {
				const ok = await requestApproval(app, 'Delete this card?');
				if (!ok) return;
				await onRemoveCard(cardId);
			})();
		});
	});
	menu.showAtMouseEvent(event);
}
