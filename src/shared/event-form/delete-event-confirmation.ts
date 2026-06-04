import type { DeleteEventConfirmationResult, EventLocation } from '../event/types';
import { TIMELINK_CARD_KEY } from '../frontmatter/timelink-frontmatter';
import { extractFirstWikiLinkPath } from '../utils/wiki-link';
import { Modal, Setting, TFile, type App } from 'obsidian';

type DeleteEventConfirmationResolver = (value: DeleteEventConfirmationResult) => void;

const hasLinkedNote = (app: App, location: EventLocation): boolean => {
	const eventFile = app.vault.getAbstractFileByPath(location.file.path);
	if (!(eventFile instanceof TFile)) return false;
	const frontmatter = app.metadataCache.getFileCache(eventFile)?.frontmatter;
	const cardLink =
		typeof frontmatter?.[TIMELINK_CARD_KEY] === 'string' ? frontmatter[TIMELINK_CARD_KEY] : null;
	const cardPath = extractFirstWikiLinkPath(cardLink ?? undefined);
	if (!cardPath) return false;
	return Boolean(app.metadataCache.getFirstLinkpathDest(cardPath, eventFile.path));
};

class DeleteEventConfirmationModal extends Modal {
	private showDeleteLinkedNote: boolean;
	private deleteLinkedNote = false;
	private onResolve: DeleteEventConfirmationResolver;
	private resolved = false;

	constructor(app: App, showDeleteLinkedNote: boolean, onResolve: DeleteEventConfirmationResolver) {
		super(app);
		this.showDeleteLinkedNote = showDeleteLinkedNote;
		this.onResolve = onResolve;
	}

	private resolve(value: DeleteEventConfirmationResult): void {
		if (this.resolved) return;
		this.resolved = true;
		this.onResolve(value);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('p', { text: 'Delete this event?' });
		if (this.showDeleteLinkedNote) {
			new Setting(contentEl).setName('Also delete linked note if empty').addToggle((toggle) => {
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
		const deleteButton = actions.createEl('button', { text: 'Delete', cls: 'mod-warning' });
		deleteButton.addEventListener('click', () => {
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

export function requestDeleteEventConfirmation(
	app: App,
	location: EventLocation,
): Promise<DeleteEventConfirmationResult> {
	return new Promise((resolve) => {
		new DeleteEventConfirmationModal(app, hasLinkedNote(app, location), resolve).open();
	});
}
