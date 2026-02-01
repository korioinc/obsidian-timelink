import { normalizeHexColor } from '../calendar/utils/month-calendar-utils';
import type TimeLinkPlugin from '../main';
import type { KanbanBoardSettings } from './board-settings';
import type { KanbanView } from './view';
import { Modal, Notice, Setting } from 'obsidian';

export class KanbanCreateModal extends Modal {
	plugin: TimeLinkPlugin;
	folderPath?: string;

	constructor(plugin: TimeLinkPlugin, folderPath?: string) {
		super(plugin.app);
		this.plugin = plugin;
		this.folderPath = folderPath;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.querySelector('.modal-title')?.classList.add('hidden');
		this.modalEl.querySelector('.modal-close-button')?.classList.add('hidden');

		contentEl.createEl('h3', {
			text: 'New kanban board',
			cls: 'm-0 mb-3 text-xl font-semibold',
		});

		const form = contentEl.createEl('form', {
			cls: 'flex items-end gap-3',
		});

		const field = form.createDiv({
			cls: 'flex flex-col gap-1 flex-1',
		});
		field.createEl('label', {
			text: 'Board name',
			cls: 'text-xs text-[color:var(--text-muted)]',
		});

		const input = field.createEl('input', {
			type: 'text',
			placeholder: 'Kanban board name',
			cls: 'h-8 px-2.5 rounded border border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-[11px] text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]',
		});

		form.createEl('button', {
			text: 'Create',
			cls: 'h-8 px-3 rounded border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] text-[11px] font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-normal)] hover:border-[var(--background-modifier-border-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]',
			type: 'submit',
		});

		form.addEventListener('submit', (event) => {
			void (async () => {
				event.preventDefault();
				const title = input.value.trim();
				if (!title) {
					new Notice('Please enter a board name.');
					return;
				}
				const file = await this.plugin.kanbanManager.createBoard(title, this.folderPath);
				await this.plugin.kanbanManager.openBoard(file);
				new Notice('Kanban board created');
				this.close();
			})();
		});

		input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function openCreateKanbanModal(plugin: TimeLinkPlugin, folderPath?: string): void {
	new KanbanCreateModal(plugin, folderPath).open();
}

export class KanbanAddLaneModal extends Modal {
	plugin: TimeLinkPlugin;
	view: KanbanView;

	constructor(plugin: TimeLinkPlugin, view: KanbanView) {
		super(plugin.app);
		this.plugin = plugin;
		this.view = view;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.querySelector('.modal-title')?.classList.add('hidden');
		this.modalEl.querySelector('.modal-close-button')?.classList.add('hidden');

		contentEl.createEl('h3', {
			text: 'Add a list',
			cls: 'm-0 mb-3 text-xl font-semibold',
		});

		const form = contentEl.createEl('form', {
			cls: 'flex items-end gap-3',
		});

		const field = form.createDiv({
			cls: 'flex flex-col gap-1 flex-1',
		});
		field.createEl('label', {
			text: 'List name',
			cls: 'text-xs text-[color:var(--text-muted)]',
		});

		const input = field.createEl('input', {
			type: 'text',
			placeholder: 'List title',
			cls: 'h-8 px-2.5 rounded border border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-[11px] text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]',
		});

		form.createEl('button', {
			text: 'Add',
			cls: 'h-8 px-3 rounded border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] text-[11px] font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-normal)] hover:border-[var(--background-modifier-border-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]',
			type: 'submit',
		});

		form.addEventListener('submit', (event) => {
			void (async () => {
				event.preventDefault();
				const title = input.value.trim();
				if (!title) {
					new Notice('Please enter a list name.');
					return;
				}
				await this.view.handleAddLane(title);
				this.close();
			})();
		});

		input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function resolveToggleValue(
	settings: KanbanBoardSettings,
	key: keyof KanbanBoardSettings,
): boolean {
	return settings[key] !== false;
}

export class KanbanBoardSettingsModal extends Modal {
	plugin: TimeLinkPlugin;
	view: KanbanView;

	constructor(plugin: TimeLinkPlugin, view: KanbanView) {
		super(plugin.app);
		this.plugin = plugin;
		this.view = view;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle('Board settings');

		if (!this.view.board) {
			new Notice('No kanban board is available.');
			this.close();
			return;
		}

		const settings = this.view.getBoardSettings();
		let pendingColor = settings['kanban-color'] ?? '';

		new Setting(contentEl)
			.setName('Kanban color')
			.setDesc('Hex color used for the board accent (for example, #4f46e5).')
			.addText((text) => {
				text.setPlaceholder('#4f46e5');
				if (settings['kanban-color']) {
					text.setValue(settings['kanban-color']);
				}
				const inputEl = text.inputEl;
				const inputWrapper = inputEl.parentElement;
				let previewEl: HTMLSpanElement | null = null;
				let randomButton: HTMLButtonElement | null = null;
				const randomHex = (): string =>
					`#${Math.floor(Math.random() * 0xffffff)
						.toString(16)
						.padStart(6, '0')}`;
				const setPreview = (value: string) => {
					const normalized = normalizeHexColor(value);
					if (previewEl) {
						if (normalized) {
							previewEl.setCssProps({
								'background-color': normalized,
								border: '1px solid var(--background-modifier-border)',
							});
						} else {
							previewEl.setCssProps({
								'background-color': 'transparent',
								border: '1px solid var(--text-muted)',
							});
						}
					}
				};
				if (inputWrapper) {
					previewEl = document.createElement('span');
					previewEl.className = 'kanban-color-preview';
					previewEl.setCssProps({
						width: '14px',
						height: '14px',
						'border-radius': '50%',
						display: 'inline-flex',
						'align-items': 'center',
						'justify-content': 'center',
					});
					randomButton = document.createElement('button');
					randomButton.type = 'button';
					randomButton.className = 'kanban-color-random';
					randomButton.setText('🎲');
					randomButton.setAttribute('aria-label', 'Random color');
					randomButton.setAttribute('title', 'Random color');
					randomButton.setCssProps({
						width: '14px',
						height: '14px',
						'border-radius': '4px',
						border: '1px solid var(--background-modifier-border)',
						background: 'var(--background-secondary)',
						color: 'var(--text-muted)',
						display: 'inline-flex',
						'align-items': 'center',
						'justify-content': 'center',
						'font-size': '10px',
						padding: '0',
						'line-height': '1',
						cursor: 'pointer',
					});
					randomButton.addEventListener('click', () => {
						const next = randomHex();
						text.setValue(next);
						pendingColor = next;
						setPreview(next);
					});
					inputWrapper.insertBefore(previewEl, inputEl);
					inputWrapper.insertBefore(randomButton, inputEl);
					setPreview(text.getValue());
				}
				text.onChange((value) => {
					pendingColor = value;
					setPreview(value);
				});
			})
			.addButton((button) => {
				button.setButtonText('Apply').setCta();
				button.onClick(() => {
					const normalized = normalizeHexColor(pendingColor);
					if (!normalized && pendingColor.trim() !== '') {
						new Notice('Please enter a valid hex color.');
						return;
					}
					void this.view.applyBoardColorChange(normalized ?? undefined);
				});
			});

		new Setting(contentEl)
			.setName('Board color indicator button')
			.setDesc('Show the board color indicator in the board header.')
			.addToggle((toggle) => {
				toggle.setValue(resolveToggleValue(settings, 'show-board-color'));
				toggle.onChange((value) => {
					void this.view.updateBoardSettings({
						'show-board-color': value ? undefined : false,
					});
				});
			});

		new Setting(contentEl)
			.setName('Add a list action button')
			.setDesc('Show the add a list action in the board header.')
			.addToggle((toggle) => {
				toggle.setValue(resolveToggleValue(settings, 'show-add-list'));
				toggle.onChange((value) => {
					void this.view.updateBoardSettings({
						'show-add-list': value ? undefined : false,
					});
				});
			});

		new Setting(contentEl)
			.setName('Open as Markdown button')
			.setDesc('Show the open as Markdown action in the board header.')
			.addToggle((toggle) => {
				toggle.setValue(resolveToggleValue(settings, 'show-view-as-markdown'));
				toggle.onChange((value) => {
					void this.view.updateBoardSettings({
						'show-view-as-markdown': value ? undefined : false,
					});
				});
			});

		new Setting(contentEl)
			.setName('Search button')
			.setDesc('Show the search action in the board header.')
			.addToggle((toggle) => {
				toggle.setValue(resolveToggleValue(settings, 'show-search'));
				toggle.onChange((value) => {
					void this.view.updateBoardSettings({
						'show-search': value ? undefined : false,
					});
				});
			});

		new Setting(contentEl)
			.setName('Board view button')
			.setDesc('Show the board view mode selector in the header.')
			.addToggle((toggle) => {
				toggle.setValue(resolveToggleValue(settings, 'show-set-view'));
				toggle.onChange((value) => {
					void this.view.updateBoardSettings({
						'show-set-view': value ? undefined : false,
					});
				});
			});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function openBoardSettingsModal(plugin: TimeLinkPlugin, view: KanbanView): void {
	new KanbanBoardSettingsModal(plugin, view).open();
}
