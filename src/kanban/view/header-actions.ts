import { BOARD_VISIBILITY_SETTINGS } from '../constants';
import { isVisibilitySettingEnabled } from '../services/header-visibility-utils';
import type {
	BoardVisibilitySetting,
	BoardVisibilitySettingKey,
	KanbanBoardSettings,
} from '../types';
import { Menu } from 'obsidian';

type ViewMode = 'board' | 'table' | 'list';
type AddAction = (icon: string, title: string, callback: (evt: MouseEvent) => void) => HTMLElement;

type ActionButtons = Record<string, HTMLElement>;
type ActionConfig = {
	buttonKey: string;
	create: () => HTMLElement;
	onDisable?: () => void;
};
type SharedActionDescriptor = {
	buttonKey: string;
	title: string;
	icon: string;
	onClick: () => void;
};
type SharedActionOptions = Pick<SyncHeaderButtonsOptions, 'onOpenBoardSettings' | 'onOpenMarkdown'>;

const BOARD_COLOR_BUTTON_KEY = 'board-color';
const BOARD_SETTINGS_BUTTON_KEY = 'board-settings';
const HEADER_BUTTON_ORDER = [
	BOARD_COLOR_BUTTON_KEY,
	'add-list',
	'open-markdown',
	'board-view',
	BOARD_SETTINGS_BUTTON_KEY,
] as const;

type SyncHeaderButtonsOptions = {
	containerEl: HTMLElement;
	actionButtons: ActionButtons;
	settings: KanbanBoardSettings | undefined;
	boardColor: string | undefined;
	isAddLaneFormOpen: boolean;
	addAction: AddAction;
	onOpenBoardSettings: () => void;
	onOpenMarkdown: () => void;
	onOpenAddLaneForm: () => void;
	onCloseAddLaneForm: () => void;
	getViewMode: () => ViewMode;
	onSetView: (mode: ViewMode) => void;
};

function getHeaderActionsContainer(containerEl: HTMLElement): HTMLElement | null {
	return containerEl.querySelector<HTMLElement>('.view-actions');
}

function getMoreOptionsButton(container: HTMLElement): HTMLElement | null {
	return (
		container.querySelector<HTMLElement>('.view-action.mod-more-options') ??
		container.querySelector<HTMLElement>('[aria-label="More options"]') ??
		container.querySelector<HTMLElement>('[aria-label="More Options"]') ??
		container.querySelector<HTMLElement>('[aria-label="More options..."]') ??
		container.querySelector<HTMLElement>('[aria-label="More Options..."]')
	);
}

function removeActionButton(actionButtons: ActionButtons, key: string): void {
	actionButtons[key]?.remove();
	delete actionButtons[key];
}

function ensureBoardColorIndicatorButton(actionButtons: ActionButtons, addAction: AddAction): void {
	const label = 'Board color';
	if (actionButtons[BOARD_COLOR_BUTTON_KEY]) return;
	const button = addAction('lucide-circle', label, () => {
		// Non-interactive indicator.
	});
	button.setAttribute('aria-label', label);
	button.setAttribute('title', label);
	button.setCssProps({
		cursor: 'default',
		display: 'inline-flex',
		'align-items': 'center',
		'justify-content': 'center',
	});

	const existingIcon = button.querySelector('svg');
	if (existingIcon) existingIcon.remove();

	const indicator = document.createElement('span');
	indicator.className = 'kanban-board-color-indicator';
	indicator.setCssProps({
		width: '12px',
		height: '12px',
		'border-radius': '50%',
		'box-sizing': 'border-box',
	});
	button.appendChild(indicator);
	actionButtons[BOARD_COLOR_BUTTON_KEY] = button;
}

function updateBoardColorIndicator(actionButtons: ActionButtons, color: string | undefined): void {
	const button = actionButtons[BOARD_COLOR_BUTTON_KEY];
	if (!button) return;
	const indicator = button.querySelector<HTMLSpanElement>('.kanban-board-color-indicator');
	if (!indicator) return;
	if (color) {
		indicator.setCssProps({
			'background-color': color,
			border: '1px solid var(--background-modifier-border)',
		});
		return;
	}
	indicator.setCssProps({
		'background-color': 'transparent',
		border: '1px solid var(--text-muted)',
	});
}

function reorderHeaderButtons(actionButtons: ActionButtons, container: HTMLElement): void {
	const moreOptionsButton = getMoreOptionsButton(container);
	const firstButtonKey = HEADER_BUTTON_ORDER.find((key) => actionButtons[key]);
	const fallbackContainer = firstButtonKey
		? (actionButtons[firstButtonKey]?.parentElement ?? null)
		: null;
	const actionContainer = fallbackContainer ?? container;
	if (!actionContainer) return;

	HEADER_BUTTON_ORDER.forEach((key) => {
		const button = actionButtons[key];
		if (!button || button.parentElement !== actionContainer) return;
		actionContainer.appendChild(button);
	});

	if (moreOptionsButton && moreOptionsButton.parentElement === actionContainer) {
		actionContainer.appendChild(moreOptionsButton);
	}
}

function syncActionButton(
	actionButtons: ActionButtons,
	settings: KanbanBoardSettings | undefined,
	options: {
		settingKey: keyof KanbanBoardSettings;
		buttonKey: string;
		create: () => HTMLElement;
		onDisable?: () => void;
	},
): void {
	if (isVisibilitySettingEnabled(settings, options.settingKey)) {
		if (!actionButtons[options.buttonKey]) {
			actionButtons[options.buttonKey] = options.create();
		}
		return;
	}
	options.onDisable?.();
	removeActionButton(actionButtons, options.buttonKey);
}

function createBoardViewAction(
	addAction: AddAction,
	getViewMode: () => ViewMode,
	onSetView: (mode: ViewMode) => void,
): HTMLElement {
	return addAction('lucide-view', 'Board view', (evt) => {
		const menu = new Menu();
		menu
			.addItem((item) =>
				item
					.setTitle('View as board')
					.setIcon('lucide-trello')
					.setChecked(getViewMode() === 'board')
					.onClick(() => onSetView('board')),
			)
			.addItem((item) =>
				item
					.setTitle('View as table')
					.setIcon('lucide-table')
					.setChecked(getViewMode() === 'table')
					.onClick(() => onSetView('table')),
			)
			.addItem((item) =>
				item
					.setTitle('View as list')
					.setIcon('lucide-server')
					.setChecked(getViewMode() === 'list')
					.onClick(() => onSetView('list')),
			)
			.showAtMouseEvent(evt);
	});
}

const buildSharedActionDescriptors = ({
	onOpenBoardSettings,
	onOpenMarkdown,
}: SharedActionOptions): {
	openMarkdown: SharedActionDescriptor;
	boardSettings: SharedActionDescriptor;
} => ({
	openMarkdown: {
		buttonKey: 'open-markdown',
		title: 'Open as Markdown',
		icon: 'lucide-file-text',
		onClick: onOpenMarkdown,
	},
	boardSettings: {
		buttonKey: BOARD_SETTINGS_BUTTON_KEY,
		title: 'Open board settings',
		icon: 'lucide-settings',
		onClick: onOpenBoardSettings,
	},
});

export const buildPaneMenuActionDescriptors = (
	options: SharedActionOptions,
): SharedActionDescriptor[] => {
	const sharedActions = buildSharedActionDescriptors(options);
	return [sharedActions.openMarkdown, sharedActions.boardSettings];
};

function getActionBySetting(
	options: SyncHeaderButtonsOptions,
): Partial<Record<BoardVisibilitySettingKey, ActionConfig>> {
	const sharedActions = buildSharedActionDescriptors(options);
	return {
		'show-set-view': {
			buttonKey: 'board-view',
			create: () =>
				createBoardViewAction(options.addAction, options.getViewMode, options.onSetView),
		},
		'show-view-as-markdown': {
			buttonKey: sharedActions.openMarkdown.buttonKey,
			create: () =>
				options.addAction(sharedActions.openMarkdown.icon, sharedActions.openMarkdown.title, () =>
					sharedActions.openMarkdown.onClick(),
				),
		},
		'show-add-list': {
			buttonKey: 'add-list',
			create: () =>
				options.addAction('lucide-plus-circle', 'Add a list', () => {
					options.onOpenAddLaneForm();
				}),
			onDisable: () => {
				if (options.isAddLaneFormOpen) {
					options.onCloseAddLaneForm();
				}
			},
		},
	};
}

function syncBoardColorAction(options: SyncHeaderButtonsOptions): void {
	if (!isVisibilitySettingEnabled(options.settings, 'show-board-color')) {
		removeActionButton(options.actionButtons, BOARD_COLOR_BUTTON_KEY);
		return;
	}
	ensureBoardColorIndicatorButton(options.actionButtons, options.addAction);
	updateBoardColorIndicator(options.actionButtons, options.boardColor);
}

function ensureBoardSettingsAction(options: SyncHeaderButtonsOptions): void {
	if (options.actionButtons[BOARD_SETTINGS_BUTTON_KEY]) return;
	const sharedActions = buildSharedActionDescriptors(options);
	options.actionButtons[BOARD_SETTINGS_BUTTON_KEY] = options.addAction(
		sharedActions.boardSettings.icon,
		sharedActions.boardSettings.title,
		() => sharedActions.boardSettings.onClick(),
	);
}

function syncConfigurableHeaderActions(options: SyncHeaderButtonsOptions): void {
	const actionBySetting = getActionBySetting(options);
	BOARD_VISIBILITY_SETTINGS.forEach((setting: BoardVisibilitySetting) => {
		if (setting.key === 'show-board-color') return;
		const action = actionBySetting[setting.key];
		if (!action) return;
		syncActionButton(options.actionButtons, options.settings, {
			settingKey: setting.key,
			buttonKey: action.buttonKey,
			create: action.create,
			onDisable: action.onDisable,
		});
	});
}

export function syncHeaderButtons(options: SyncHeaderButtonsOptions): void {
	syncBoardColorAction(options);
	ensureBoardSettingsAction(options);
	syncConfigurableHeaderActions(options);

	const container = getHeaderActionsContainer(options.containerEl);
	if (!container) return;
	reorderHeaderButtons(options.actionButtons, container);
}
