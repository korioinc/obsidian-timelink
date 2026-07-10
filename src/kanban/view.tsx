import { readFrontmatterString } from '../shared/frontmatter/file-frontmatter';
import { KANBAN_BOARD_COLOR_KEY } from '../shared/frontmatter/kanban-frontmatter';
import { TIMELINK_CARD_KEY, TIMELINK_EVENT_KEY } from '../shared/frontmatter/timelink-frontmatter';
import { SerialTaskQueue } from '../shared/utils/serial-task-queue';
import { ViewRenderLifecycle } from '../shared/view/view-render-lifecycle';
import { KANBAN_ICON, KANBAN_VIEW_TYPE } from './constants';
import {
	findOpenKanbanLeafByPath,
	removeCardFromBoardFile,
	resolveLinkedCardFile,
} from './services/card-service';
import { registerKanbanCardEventIndicatorRefresh } from './services/event-indicator-refresh-service';
import { buildCardDerivedState } from './services/model-service';
import { serializeKanbanBoard } from './services/parser-service';
import {
	buildKanbanRootActionHandlers,
	removeCardForExternalMove as removeCardForExternalMoveService,
} from './services/view-action-service';
import {
	applyBoardColorChange as applyBoardColorChangeService,
	applyBoardMutation as applyBoardMutationService,
	updateBoardSettings as updateBoardSettingsService,
} from './services/view-board-service';
import {
	buildKanbanViewState,
	parseBoardStateFromViewData,
	resolveKanbanViewMode,
	type KanbanViewMode,
} from './services/view-composition-service';
import type { KanbanViewServiceContext } from './services/view-service-context';
import type { KanbanBoard, KanbanBoardSettings, KanbanRootActionHandlers } from './types';
import { KanbanRoot, type KanbanRootProps } from './view/KanbanRoot';
import {
	buildPaneMenuActionDescriptors,
	syncHeaderButtons as syncViewHeaderButtons,
} from './view/header-actions';
import { openBoardSettingsModal } from './view/modal';
import { Menu, Notice, TextFileView, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import { render } from 'preact';

export type KanbanViewPluginContext = {
	calendar: KanbanViewServiceContext['calendar'];
	getTodayDateKey: () => string;
	openKanbanAsMarkdown: (leaf: WorkspaceLeaf, options: { readOnly: boolean }) => Promise<void>;
};

export class KanbanView extends TextFileView {
	plugin: KanbanViewPluginContext;
	board: KanbanBoard | null = null;
	actionButtons: Record<string, HTMLElement> = {};
	private viewMode: KanbanViewMode = 'board';
	private isAddLaneFormOpen = false;
	private addLaneAnchorRect: DOMRect | null = null;
	private cardTitleById = new Map<string, string>();
	private cardHasEventById = new Map<string, boolean>();
	private linkedCardPaths = new Set<string>();
	private stopCardEventIndicatorRefresh: (() => void) | null = null;
	private rootActionHandlers: KanbanRootActionHandlers | null = null;
	private readonly renderLifecycle = new ViewRenderLifecycle();
	private readonly boardMutationQueue = new SerialTaskQueue();
	private static readonly CARD_EVENT_PROPERTY = TIMELINK_EVENT_KEY;
	private static readonly EVENT_CARD_PROPERTY = TIMELINK_CARD_KEY;
	private static readonly BOARD_COLOR_PROPERTY = KANBAN_BOARD_COLOR_KEY;

	constructor(leaf: WorkspaceLeaf, plugin: KanbanViewPluginContext) {
		super(leaf);
		this.plugin = plugin;
		this.allowNoFile = false;
		this.navigation = true;
	}

	getViewType(): string {
		return KANBAN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file?.basename || 'Kanban board';
	}

	getIcon(): string {
		return KANBAN_ICON;
	}

	private openAsMarkdown(): void {
		void this.plugin.openKanbanAsMarkdown(this.leaf, { readOnly: true }).catch((error: unknown) => {
			console.error('Failed to open kanban board as markdown', error);
			new Notice('Failed to open board as Markdown.');
		});
	}

	private syncHeaderButtons(): void {
		syncViewHeaderButtons({
			containerEl: this.containerEl,
			actionButtons: this.actionButtons,
			settings: this.board?.settings,
			boardColor: this.board?.settings?.[KANBAN_BOARD_COLOR_KEY],
			isAddLaneFormOpen: this.isAddLaneFormOpen,
			addAction: (icon, title, callback) => this.addAction(icon, title, callback),
			onOpenBoardSettings: () => this.openBoardSettings(),
			onOpenMarkdown: () => this.openAsMarkdown(),
			onOpenAddLaneForm: () => this.openAddLaneForm(),
			onCloseAddLaneForm: () => this.closeAddLaneForm(),
			getViewMode: () => this.viewMode,
			onSetView: (mode) => this.setView(mode),
		});
	}

	private openBoardSettings(): void {
		openBoardSettingsModal({ app: this.app }, this);
	}

	getBoardSettings(): KanbanBoardSettings {
		return this.board?.settings ?? {};
	}

	private async applyBoardMutation(mutate: (board: KanbanBoard) => KanbanBoard): Promise<boolean> {
		return this.boardMutationQueue.run(() =>
			applyBoardMutationService(this.createServiceContext(), mutate),
		);
	}

	async updateBoardSettings(partial: KanbanBoardSettings): Promise<void> {
		await this.boardMutationQueue.run(() =>
			updateBoardSettingsService(this.createServiceContext(), partial),
		);
	}

	async applyBoardColorChange(color: string | undefined): Promise<void> {
		await this.boardMutationQueue.run(async () => {
			await applyBoardColorChangeService(this.createServiceContext(), color);
			const file = this.file;
			if (file) this.data = await this.app.vault.read(file);
		});
	}

	openAddLaneForm(): void {
		const anchor = this.actionButtons['add-list'];
		this.addLaneAnchorRect = anchor?.getBoundingClientRect() ?? null;
		this.isAddLaneFormOpen = true;
		this.render();
	}

	private closeAddLaneForm(): void {
		if (!this.isAddLaneFormOpen) return;
		this.isAddLaneFormOpen = false;
		this.addLaneAnchorRect = null;
		this.render();
	}

	private setView(mode: KanbanViewMode): void {
		this.viewMode = mode;
		this.render();
	}

	private appendPaneMenuItems(menu: Menu): void {
		buildPaneMenuActionDescriptors({
			onOpenBoardSettings: () => this.openBoardSettings(),
			onOpenMarkdown: () => this.openAsMarkdown(),
		}).forEach((action) => {
			menu.addItem((item) => {
				item.setTitle(action.title);
				item.setIcon(action.icon);
				item.setSection('pane');
				item.onClick(() => action.onClick());
			});
		});
	}

	onPaneMenu(menu: Menu, source: string): void {
		if (source !== 'more-options') {
			super.onPaneMenu(menu, source);
			return;
		}
		this.appendPaneMenuItems(menu);
		super.onPaneMenu(menu, source);
	}

	getState(): Record<string, unknown> {
		return buildKanbanViewState(super.getState(), this.file?.path, this.viewMode);
	}

	async onOpen(): Promise<void> {
		const generation = this.renderLifecycle.beginOpen();
		await super.onOpen();
		if (!this.renderLifecycle.canRender(generation)) return;
		this.stopCardEventIndicatorRefresh?.();
		this.stopCardEventIndicatorRefresh = registerKanbanCardEventIndicatorRefresh(
			this.app,
			() => this.linkedCardPaths,
			() => this.render(),
		);
		this.syncHeaderButtons();
		this.render();
	}

	async onClose(): Promise<void> {
		const generation = this.renderLifecycle.beginClose();
		await super.onClose();
		if (!this.renderLifecycle.canUnmount(generation)) return;
		this.stopCardEventIndicatorRefresh?.();
		this.stopCardEventIndicatorRefresh = null;
		Object.values(this.actionButtons).forEach((button) => button.remove());
		this.actionButtons = {};
		render(null, this.contentEl);
	}

	async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
		const generation = this.renderLifecycle.capture();
		this.viewMode = resolveKanbanViewMode(state.viewMode, this.viewMode);
		await super.setState(state, result);
		if (!this.renderLifecycle.canRender(generation)) return;
		this.render();
	}

	getViewData(): string {
		return this.data ?? '';
	}

	setViewData(data: string, clear: boolean): void {
		if (clear) {
			this.board = null;
			this.data = '';
		}
		const parsedBoard = parseBoardStateFromViewData({
			app: this.app,
			file: this.file,
			data,
			boardColorProperty: KanbanView.BOARD_COLOR_PROPERTY,
		});
		if (!parsedBoard) {
			new Notice('Not a kanban board file.');
			this.board = null;
			this.data = data;
			this.render();
			return;
		}
		this.data = data;
		this.board = parsedBoard;
		this.syncHeaderButtons();
		this.render();
	}

	clear(): void {
		this.board = null;
		this.data = '';
	}

	private refreshCardDerivedState(): void {
		const sourcePath = this.file?.path;
		const derivedState = buildCardDerivedState(this.board, (title) => {
			if (!sourcePath) return null;
			const linkedCardFile = resolveLinkedCardFile(this.app, sourcePath, title);
			if (!linkedCardFile) return null;
			return {
				path: linkedCardFile.path,
				hasEvent:
					readFrontmatterString(this.app, linkedCardFile, KanbanView.CARD_EVENT_PROPERTY) !== null,
			};
		});
		this.cardTitleById = derivedState.titleById;
		this.cardHasEventById = derivedState.hasEventById;
		this.linkedCardPaths = derivedState.linkedPaths;
	}

	private getRootActionHandlers(): KanbanRootActionHandlers {
		this.rootActionHandlers ??= buildKanbanRootActionHandlers(this.createServiceContext(), () =>
			this.closeAddLaneForm(),
		);
		return this.rootActionHandlers;
	}

	private buildRootProps(): KanbanRootProps {
		const sourcePath = this.file?.path ?? '';
		return {
			board: this.board,
			markdownContext: {
				app: this.app,
				component: this,
				sourcePath,
			},
			viewMode: this.viewMode,
			showAddLaneForm: this.isAddLaneFormOpen,
			addLaneAnchorRect: this.addLaneAnchorRect,
			addLaneAnchorEl: this.actionButtons['add-list'],
			cardHasEventById: this.cardHasEventById,
			...this.getRootActionHandlers(),
		};
	}

	render(): void {
		if (!this.renderLifecycle.canRender()) return;
		this.contentEl.classList.add('h-full');
		this.refreshCardDerivedState();
		const rootProps = this.buildRootProps();
		render(<KanbanRoot {...rootProps} />, this.contentEl);
	}

	private async removeCardForExternalMove(cardId: string): Promise<boolean> {
		return removeCardForExternalMoveService(this.createServiceContext(), cardId);
	}

	private async removeCardFromSourceBoard(
		sourceBoardPath: string,
		cardId: string,
	): Promise<boolean> {
		const sourceLeaf = findOpenKanbanLeafByPath(this.app, KANBAN_VIEW_TYPE, sourceBoardPath);
		const sourceView = sourceLeaf?.view;
		if (sourceView instanceof KanbanView) {
			return sourceView.removeCardForExternalMove(cardId);
		}
		return removeCardFromBoardFile(this.app, sourceBoardPath, cardId);
	}

	async persist(): Promise<void> {
		const board = this.board;
		if (!board) return;
		const file = this.file;
		if (!file) {
			throw new Error('Cannot persist a kanban board without a file.');
		}
		const currentData = await this.app.vault.read(file);
		const updated = serializeKanbanBoard(board, currentData);
		this.data = updated;
		try {
			await this.save();
		} catch (error) {
			this.data = currentData;
			throw error;
		}
	}

	private createServiceContext(): KanbanViewServiceContext {
		return {
			app: this.app,
			getFile: () => this.file ?? null,
			getBoard: () => this.board,
			setBoard: (board: KanbanBoard | null) => {
				this.board = board;
			},
			persist: () => this.persist(),
			render: () => this.render(),
			syncHeaderButtons: () => this.syncHeaderButtons(),
			getCardTitle: (id: string) => this.cardTitleById.get(id) ?? null,
			calendar: this.plugin.calendar,
			getTodayDateKey: () => this.plugin.getTodayDateKey(),
			applyBoardMutation: (mutate: (board: KanbanBoard) => KanbanBoard) =>
				this.applyBoardMutation(mutate),
			removeCardFromSourceBoard: (sourceBoardPath: string, cardId: string) =>
				this.removeCardFromSourceBoard(sourceBoardPath, cardId),
			boardColorProperty: KanbanView.BOARD_COLOR_PROPERTY,
			cardEventProperty: KanbanView.CARD_EVENT_PROPERTY,
			eventCardProperty: KanbanView.EVENT_CARD_PROPERTY,
		};
	}
}
