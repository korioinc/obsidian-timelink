import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import {
	getDeleteLinkedNoteLabel,
	resolveCardRemovalTargets,
} from '../services/card-removal-service';
import type { RemoveCardOptions } from '../types';
import type { App } from 'obsidian';
import { Menu, Modal, Notice, Setting } from 'obsidian';

type ApprovalResult = (value: boolean) => void;
type CardRemovalApprovalResult = (value: { approved: boolean; deleteLinkedNote: boolean }) => void;

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

class CardRemovalApprovalModal extends Modal {
	private message: string;
	private showDeleteLinkedNote: boolean;
	private deleteLinkedNoteLabel: string;
	private deleteLinkedNote = false;
	private onResolve: CardRemovalApprovalResult;
	private resolved = false;

	constructor(
		app: App,
		params: {
			message: string;
			showDeleteLinkedNote: boolean;
			deleteLinkedNoteLabel: string;
		},
		onResolve: CardRemovalApprovalResult,
	) {
		super(app);
		this.message = params.message;
		this.showDeleteLinkedNote = params.showDeleteLinkedNote;
		this.deleteLinkedNoteLabel = params.deleteLinkedNoteLabel;
		this.onResolve = onResolve;
	}

	private resolve(value: { approved: boolean; deleteLinkedNote: boolean }): void {
		if (this.resolved) return;
		this.resolved = true;
		this.onResolve(value);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('p', { text: this.message });
		if (this.showDeleteLinkedNote) {
			new Setting(contentEl).setName(this.deleteLinkedNoteLabel).addToggle((toggle) => {
				toggle.setValue(this.deleteLinkedNote);
				toggle.onChange((value) => {
					this.deleteLinkedNote = value;
				});
			});
		}
		const actions = contentEl.createDiv({ cls: 'modal-button-container' });
		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.resolve({ approved: false, deleteLinkedNote: false });
			this.close();
		});
		const approveButton = actions.createEl('button', { text: 'Confirm', cls: 'mod-cta' });
		approveButton.addEventListener('click', () => {
			this.resolve({
				approved: true,
				deleteLinkedNote: this.showDeleteLinkedNote ? this.deleteLinkedNote : false,
			});
			this.close();
		});
	}

	onClose(): void {
		this.resolve({ approved: false, deleteLinkedNote: false });
		this.contentEl.empty();
	}
}

export function requestCardRemovalApproval(
	app: App,
	params: {
		showDeleteLinkedNote: boolean;
		hasLinkedEvent: boolean;
	},
): Promise<{ approved: boolean; deleteLinkedNote: boolean }> {
	return new Promise((resolve) => {
		const modal = new CardRemovalApprovalModal(
			app,
			{
				message: 'Delete this card?',
				showDeleteLinkedNote: params.showDeleteLinkedNote,
				deleteLinkedNoteLabel: getDeleteLinkedNoteLabel(params.hasLinkedEvent),
			},
			resolve,
		);
		modal.open();
	});
}

type CardMenuCallbacks = {
	onStartEdit: (cardId: string, title: string) => void;
	onCreateNoteFromCard: (cardId: string) => void;
	onCopyCardLink: (cardId: string) => void;
	onCreateEventFromCard: (cardId: string) => void;
	onRemoveCard: (cardId: string, options?: RemoveCardOptions) => Promise<void>;
};

type ShowCardMenuParams = CardMenuCallbacks & {
	app: App;
	event: MouseEvent;
	sourcePath: string;
	cardId: string;
	title: string;
};

export function showCardMenu(params: ShowCardMenuParams): void {
	const {
		app,
		event,
		sourcePath,
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
				const targets = resolveCardRemovalTargets(app, sourcePath, title, TIMELINK_EVENT_KEY);
				const approval = await requestCardRemovalApproval(app, {
					showDeleteLinkedNote: Boolean(targets.linkedCardFile),
					hasLinkedEvent: Boolean(targets.linkedEventFile),
				});
				if (!approval.approved) return;
				await onRemoveCard(cardId, { deleteLinkedNote: approval.deleteLinkedNote });
			})();
		});
	});
	menu.showAtMouseEvent(event);
}
