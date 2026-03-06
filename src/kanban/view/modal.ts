import { normalizeHexColor } from '../../shared/color/normalize-hex-color';
import { KANBAN_BOARD_COLOR_KEY } from '../../shared/frontmatter/kanban-frontmatter';
import { BOARD_VISIBILITY_SETTINGS } from '../constants';
import type {
	BoardVisibilitySetting,
	BoardVisibilitySettingKey,
	KanbanBoardSettingsView,
	KanbanBoardSettings,
} from '../types';
import { Modal, Notice, Setting, type App, type TFile } from 'obsidian';

type CompactInputModalOptions = {
	title: string;
	fieldLabel: string;
	placeholder: string;
	submitLabel: string;
	emptyNotice: string;
	successNotice?: string;
	onSubmit: (value: string) => Promise<void>;
};

type KanbanBoardModalPluginContext = {
	app: App;
};

type KanbanCreateModalPluginContext = KanbanBoardModalPluginContext & {
	kanbanManager: {
		createBoard: (title: string, folderPath?: string) => Promise<TFile>;
		openBoard: (file: TFile) => Promise<void>;
	};
};

function buildCompactInputModal(modal: Modal, options: CompactInputModalOptions): void {
	const { contentEl } = modal;
	contentEl.empty();
	modal.modalEl.querySelector('.modal-title')?.classList.add('hidden');
	modal.modalEl.querySelector('.modal-close-button')?.classList.add('hidden');

	contentEl.createEl('h3', {
		text: options.title,
		cls: 'm-0 mb-3 text-xl font-semibold',
	});

	const form = contentEl.createEl('form', {
		cls: 'flex items-end gap-3',
	});

	const field = form.createDiv({
		cls: 'flex flex-col gap-1 flex-1',
	});
	field.createEl('label', {
		text: options.fieldLabel,
		cls: 'text-xs text-[color:var(--text-muted)]',
	});

	const input = field.createEl('input', {
		type: 'text',
		placeholder: options.placeholder,
		cls: 'h-8 px-2.5 rounded border border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-[11px] text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]',
	});

	form.createEl('button', {
		text: options.submitLabel,
		cls: 'h-8 px-3 rounded border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] text-[11px] font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-normal)] hover:border-[var(--background-modifier-border-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]',
		type: 'submit',
	});

	form.addEventListener('submit', (event) => {
		void (async () => {
			event.preventDefault();
			const value = input.value.trim();
			if (!value) {
				new Notice(options.emptyNotice);
				return;
			}
			await options.onSubmit(value);
			if (options.successNotice) {
				new Notice(options.successNotice);
			}
			modal.close();
		})();
	});

	input.focus();
}

class KanbanCreateModal extends Modal {
	plugin: KanbanCreateModalPluginContext;
	folderPath?: string;

	constructor(plugin: KanbanCreateModalPluginContext, folderPath?: string) {
		super(plugin.app);
		this.plugin = plugin;
		this.folderPath = folderPath;
	}

	onOpen(): void {
		buildCompactInputModal(this, {
			title: 'New kanban board',
			fieldLabel: 'Board name',
			placeholder: 'Kanban board name',
			submitLabel: 'Create',
			emptyNotice: 'Please enter a board name.',
			successNotice: 'Kanban board created',
			onSubmit: async (value) => {
				const file = await this.plugin.kanbanManager.createBoard(value, this.folderPath);
				await this.plugin.kanbanManager.openBoard(file);
			},
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function openCreateKanbanModal(
	plugin: KanbanCreateModalPluginContext,
	folderPath?: string,
): void {
	new KanbanCreateModal(plugin, folderPath).open();
}

function resolveToggleValue(
	settings: KanbanBoardSettings,
	key: BoardVisibilitySettingKey,
): boolean {
	return settings[key] !== false;
}

function addVisibilityToggleSetting(
	containerEl: HTMLElement,
	settings: KanbanBoardSettings,
	view: KanbanBoardSettingsView,
	config: BoardVisibilitySetting,
): void {
	new Setting(containerEl)
		.setName(config.name)
		.setDesc(config.description)
		.addToggle((toggle) => {
			toggle.setValue(resolveToggleValue(settings, config.key));
			toggle.onChange((value) => {
				void view.updateBoardSettings({
					[config.key]: value ? undefined : false,
				} as KanbanBoardSettings);
			});
		});
}

function addBoardColorSetting(
	containerEl: HTMLElement,
	settings: KanbanBoardSettings,
	view: KanbanBoardSettingsView,
): void {
	let pendingColor = settings[KANBAN_BOARD_COLOR_KEY] ?? '';

	new Setting(containerEl)
		.setName('Kanban color')
		.setDesc('Hex color used for the board accent (for example, #4f46e5).')
		.addText((text) => {
			text.setPlaceholder('#4f46e5');
			if (settings[KANBAN_BOARD_COLOR_KEY]) {
				text.setValue(settings[KANBAN_BOARD_COLOR_KEY]);
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
				void view.applyBoardColorChange(normalized ?? undefined);
			});
		});
}

class KanbanBoardSettingsModal extends Modal {
	view: KanbanBoardSettingsView;

	constructor(plugin: KanbanBoardModalPluginContext, view: KanbanBoardSettingsView) {
		super(plugin.app);
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
		addBoardColorSetting(contentEl, settings, this.view);

		BOARD_VISIBILITY_SETTINGS.forEach((config) => {
			addVisibilityToggleSetting(contentEl, settings, this.view, config);
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function openBoardSettingsModal(
	plugin: KanbanBoardModalPluginContext,
	view: KanbanBoardSettingsView,
): void {
	new KanbanBoardSettingsModal(plugin, view).open();
}
