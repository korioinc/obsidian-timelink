import { normalizeHexColor } from '../calendar/utils/month-calendar-utils';
import type TimeLinkPlugin from '../main';
import { KanbanRoot } from './_components/KanbanRoot';
import { KanbanBoardSettings, normalizeBoardSettings } from './board-settings';
import { KANBAN_ICON, KANBAN_VIEW_TYPE } from './constants';
import { openBoardSettingsModal } from './modal';
import {
	addCard,
	addLane,
	isKanbanBoard,
	KanbanBoard,
	moveCard,
	parseKanbanBoard,
	removeCard,
	removeLane,
	serializeKanbanBoard,
	updateCardTitle,
	updateCardBlockId,
	updateLaneTitle,
} from './parser';
import { Menu, Notice, TextFileView, ViewStateResult, WorkspaceLeaf, TFile } from 'obsidian';
import { render } from 'preact';

export class KanbanView extends TextFileView {
	plugin: TimeLinkPlugin;
	board: KanbanBoard | null = null;
	actionButtons: Record<string, HTMLElement> = {};
	private viewMode: 'board' | 'table' | 'list' = 'board';
	private isAddLaneFormOpen = false;
	private addLaneAnchorRect: DOMRect | null = null;
	private cardTitleById = new Map<string, string>();
	private static readonly CARD_EVENT_PROPERTY = 'timelinkEvent';
	private static readonly EVENT_CARD_PROPERTY = 'timelinkCard';

	constructor(leaf: WorkspaceLeaf, plugin: TimeLinkPlugin) {
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

	private ensureHeaderButtons(): void {
		this.ensureBoardColorIndicator();
		if (this.actionButtons['board-settings']) return;

		this.actionButtons['board-settings'] = this.addAction(
			'lucide-settings',
			'Open board settings',
			() => {
				this.openBoardSettings();
			},
		);
		this.reorderHeaderButtons();
	}

	private ensureBoardColorIndicator(): void {
		if (!this.isButtonEnabled('show-board-color')) {
			this.removeActionButton('board-color');
			return;
		}
		const label = 'Board color';
		if (!this.actionButtons['board-color']) {
			const button = this.addAction('lucide-circle', label, () => {
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

			this.actionButtons['board-color'] = button;
		}

		this.updateBoardColorIndicator();
	}

	private updateBoardColorIndicator(): void {
		const button = this.actionButtons['board-color'];
		if (!button) return;
		const indicator = button.querySelector<HTMLSpanElement>('.kanban-board-color-indicator');
		if (!indicator) return;
		const color = this.board?.settings?.['kanban-color'];
		if (color) {
			indicator.setCssProps({
				'background-color': color,
				border: '1px solid var(--background-modifier-border)',
			});
		} else {
			indicator.setCssProps({
				'background-color': 'transparent',
				border: '1px solid var(--text-muted)',
			});
		}
	}

	private reorderHeaderButtons(): void {
		const order = [
			'board-color',
			'add-list',
			'open-markdown',
			'search',
			'board-view',
			'board-settings',
		] as const;
		const container = this.getHeaderActionsContainer();
		if (!container) return;
		const moreOptionsButton = this.getMoreOptionsButton(container);
		const firstButtonKey = order.find((key) => this.actionButtons[key]);
		const fallbackContainer = firstButtonKey
			? (this.actionButtons[firstButtonKey]?.parentElement ?? null)
			: null;
		const actionContainer = fallbackContainer ?? container;
		if (!actionContainer) return;

		order.forEach((key) => {
			const button = this.actionButtons[key];
			if (!button || button.parentElement !== actionContainer) return;
			actionContainer.appendChild(button);
		});

		if (moreOptionsButton && moreOptionsButton.parentElement === actionContainer) {
			actionContainer.appendChild(moreOptionsButton);
		}
	}

	private getHeaderActionsContainer(): HTMLElement | null {
		return this.containerEl?.querySelector<HTMLElement>('.view-actions') ?? null;
	}

	private getMoreOptionsButton(container: HTMLElement): HTMLElement | null {
		return (
			container.querySelector<HTMLElement>('[aria-label="More options"]') ??
			container.querySelector<HTMLElement>('[aria-label="More Options"]') ??
			container.querySelector<HTMLElement>('[aria-label="More options..."]') ??
			container.querySelector<HTMLElement>('[aria-label="More Options..."]')
		);
	}

	private removeActionButton(key: string): void {
		const button = this.actionButtons[key];
		if (!button) return;
		button.remove();
		delete this.actionButtons[key];
	}

	private isButtonEnabled(key: keyof KanbanBoardSettings): boolean {
		const settings = this.board?.settings ?? normalizeBoardSettings();
		return settings[key] !== false;
	}

	private updateHeaderButtonsVisibility(): void {
		if (this.isButtonEnabled('show-board-color')) {
			this.ensureBoardColorIndicator();
		} else {
			this.removeActionButton('board-color');
		}

		if (this.isButtonEnabled('show-set-view')) {
			if (!this.actionButtons['board-view']) {
				this.actionButtons['board-view'] = this.addAction('lucide-view', 'Board view', (evt) => {
					const menu = new Menu();
					menu
						.addItem((item) =>
							item
								.setTitle('View as board')
								.setIcon('lucide-trello')
								.setChecked(this.viewMode === 'board')
								.onClick(() => this.setView('board')),
						)
						.addItem((item) =>
							item
								.setTitle('View as table')
								.setIcon('lucide-table')
								.setChecked(this.viewMode === 'table')
								.onClick(() => this.setView('table')),
						)
						.addItem((item) =>
							item
								.setTitle('View as list')
								.setIcon('lucide-server')
								.setChecked(this.viewMode === 'list')
								.onClick(() => this.setView('list')),
						)
						.showAtMouseEvent(evt);
				});
			}
		} else {
			this.removeActionButton('board-view');
		}

		if (this.isButtonEnabled('show-search')) {
			if (!this.actionButtons['search']) {
				this.actionButtons['search'] = this.addAction('lucide-search', 'Search...', () => {
					// TODO: wire up search behavior.
				});
			}
		} else {
			this.removeActionButton('search');
		}

		if (this.isButtonEnabled('show-view-as-markdown')) {
			if (!this.actionButtons['open-markdown']) {
				this.actionButtons['open-markdown'] = this.addAction(
					'lucide-file-text',
					'Open as Markdown',
					() => {
						void this.plugin.openKanbanAsMarkdown(this.leaf, { readOnly: true });
					},
				);
			}
		} else {
			this.removeActionButton('open-markdown');
		}

		if (this.isButtonEnabled('show-add-list')) {
			if (!this.actionButtons['add-list']) {
				this.actionButtons['add-list'] = this.addAction('lucide-plus-circle', 'Add a list', () => {
					this.openAddLaneForm();
				});
			}
		} else {
			if (this.isAddLaneFormOpen) {
				this.closeAddLaneForm();
			}
			this.removeActionButton('add-list');
		}

		this.reorderHeaderButtons();
	}

	private openBoardSettings(): void {
		openBoardSettingsModal(this.plugin, this);
	}

	getBoardSettings(): KanbanBoardSettings {
		return this.board?.settings ?? {};
	}

	async updateBoardSettings(partial: KanbanBoardSettings): Promise<void> {
		if (!this.board) return;
		const next = { ...this.board.settings, ...partial };
		Object.keys(next).forEach((key) => {
			const typedKey = key as keyof KanbanBoardSettings;
			if (next[typedKey] === undefined) {
				delete next[typedKey];
			}
		});
		this.board = { ...this.board, settings: normalizeBoardSettings(next) };
		await this.persist();
		this.updateHeaderButtonsVisibility();
		this.updateBoardColorIndicator();
		this.render();
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

	private setView(mode: 'board' | 'table' | 'list'): void {
		this.viewMode = mode;
		this.render();
	}

	onPaneMenu(menu: Menu, source: string): void {
		if (source !== 'more-options') {
			super.onPaneMenu(menu, source);
			return;
		}

		menu.addItem((item) => {
			item.setTitle('Open as Markdown');
			item.setIcon('lucide-file-text');
			item.setSection('pane');
			item.onClick(() => {
				void this.plugin.openKanbanAsMarkdown(this.leaf, { readOnly: true });
			});
		});

		menu.addItem((item) => {
			item.setTitle('Open board settings');
			item.setIcon('lucide-settings');
			item.setSection('pane');
			item.onClick(() => {
				this.openBoardSettings();
			});
		});

		super.onPaneMenu(menu, source);
	}

	getState(): Record<string, unknown> {
		const state = super.getState();
		if (this.file?.path) {
			return { ...state, file: this.file.path, viewMode: this.viewMode };
		}
		return { ...state, viewMode: this.viewMode };
	}

	async onOpen(): Promise<void> {
		await super.onOpen();
		this.ensureHeaderButtons();
		this.updateHeaderButtonsVisibility();
		this.render();
	}

	async onClose(): Promise<void> {
		await super.onClose();
		Object.values(this.actionButtons).forEach((button) => button.remove());
		this.actionButtons = {};
		render(null, this.contentEl);
	}

	async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
		const nextMode = state.viewMode;
		if (nextMode === 'board' || nextMode === 'table' || nextMode === 'list') {
			this.viewMode = nextMode;
		}
		await super.setState(state, result);
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
		if (!isKanbanBoard(data)) {
			new Notice('Not a kanban board file.');
			this.board = null;
			this.data = data;
			this.render();
			return;
		}
		this.data = data;
		this.board = parseKanbanBoard(data);
		this.updateHeaderButtonsVisibility();
		this.updateBoardColorIndicator();
		this.render();
	}

	clear(): void {
		this.board = null;
		this.data = '';
	}

	render(): void {
		this.contentEl.classList.add('h-full');
		this.cardTitleById = new Map(
			this.board?.lanes.flatMap((lane) => lane.cards.map((card) => [card.id, card.title])) ?? [],
		);
		const boardSettings = this.board?.settings ?? {};
		render(
			<KanbanRoot
				board={this.board}
				markdownContext={{
					app: this.app,
					component: this,
					sourcePath: this.file?.path ?? '',
				}}
				viewMode={this.viewMode}
				accentColor={boardSettings['kanban-color']}
				showAddLaneForm={this.isAddLaneFormOpen}
				addLaneAnchorRect={this.addLaneAnchorRect}
				addLaneAnchorEl={this.actionButtons['add-list']}
				onCloseAddLaneForm={() => this.closeAddLaneForm()}
				onAddLane={(title) => this.handleAddLane(title)}
				onCreateNoteFromCard={(cardId) => void this.handleCreateNoteFromCard(cardId)}
				onCopyCardLink={(cardId) => void this.handleCopyCardLink(cardId)}
				onCreateEventFromCard={(cardId) => void this.handleCreateEventFromCard(cardId)}
				onRemoveLane={(laneId) => this.handleRemoveLane(laneId)}
				onReorderLanes={(order) => this.handleReorderLanes(order)}
				onAddCard={(laneId, title) => this.handleAddCard(laneId, title)}
				onUpdateLaneTitle={(laneId, title) => this.handleUpdateLaneTitle(laneId, title)}
				onRemoveCard={(cardId) => this.handleRemoveCard(cardId)}
				onUpdateCardTitle={(cardId, title) => this.handleUpdateCardTitle(cardId, title)}
				onMoveCard={(cardId, laneId, index) => this.handleMoveCard(cardId, laneId, index)}
			/>,
			this.contentEl,
		);
	}

	async handleAddLane(title: string): Promise<void> {
		if (!this.board) return;
		this.board = addLane(this.board, title);
		await this.persist();
		this.render();
	}

	async handleRemoveLane(laneId: string): Promise<void> {
		if (!this.board) return;
		this.board = removeLane(this.board, laneId);
		await this.persist();
		this.render();
	}

	async handleReorderLanes(order: string[]): Promise<void> {
		if (!this.board) return;
		const laneMap = new Map(this.board.lanes.map((lane) => [lane.id, lane]));
		const nextLanes = order
			.map((id) => laneMap.get(id))
			.filter((lane): lane is KanbanBoard['lanes'][number] => Boolean(lane));
		const missing = this.board.lanes.filter((lane) => !order.includes(lane.id));
		this.board = { lanes: [...nextLanes, ...missing], settings: this.board.settings };
		await this.persist();
		this.render();
	}

	async handleAddCard(laneId: string, title: string): Promise<void> {
		if (!this.board) return;
		this.board = addCard(this.board, laneId, title);
		await this.persist();
		this.render();
	}

	async handleUpdateLaneTitle(laneId: string, title: string): Promise<void> {
		if (!this.board) return;
		this.board = updateLaneTitle(this.board, laneId, title);
		await this.persist();
		this.render();
	}

	async handleRemoveCard(cardId: string): Promise<void> {
		if (!this.board) return;
		this.board = removeCard(this.board, cardId);
		await this.persist();
		this.render();
	}

	async handleUpdateCardTitle(cardId: string, title: string): Promise<void> {
		if (!this.board) return;
		this.board = updateCardTitle(this.board, cardId, title);
		await this.persist();
		this.render();
	}

	private getTitleParts(title: string): { titleLine: string; rest: string } {
		const lines = title.replace(/\r\n/g, '\n').split('\n');
		const titleLine = lines.shift()?.trim() ?? '';
		const rest = lines.join('\n').trimEnd();
		return { titleLine, rest };
	}

	private getFirstWikiLinkPath(value: string): string | null {
		const match = value.match(/\[\[([^\]]+)\]\]/);
		if (!match?.[1]) return null;
		const raw = match[1].trim();
		if (!raw) return null;
		const noAlias = raw.split('|')[0]?.trim() ?? '';
		if (!noAlias) return null;
		return noAlias.split('#')[0]?.trim() ?? null;
	}

	private async updateCardTitleWithLink(
		cardId: string,
		link: string,
		originalTitle: string,
	): Promise<void> {
		if (!this.board) return;
		const { rest } = this.getTitleParts(originalTitle);
		const normalizedRest = rest.replace(/^(?:\s*\n)+/, '');
		const nextTitle = normalizedRest ? `${link}\n${normalizedRest}` : link;
		this.board = updateCardTitle(this.board, cardId, nextTitle);
		await this.persist();
		this.render();
	}

	private async setFrontmatterLink(file: TFile, key: string, link: string): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[key] = link;
		});
	}

	private async ensureCardTextFile(titleLine: string): Promise<TFile> {
		const cleanedTitle = titleLine.replace(/\[\[|\]\]|\[|\]|\(|\)/g, '').trim() || 'New card';
		const sanitizedTitle = cleanedTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'New card';
		const parent = this.app.fileManager.getNewFileParent(this.file?.path ?? '');
		const basePath = parent.path ? `${parent.path}/${sanitizedTitle}.md` : `${sanitizedTitle}.md`;
		const existing = this.app.vault.getAbstractFileByPath(basePath);
		if (existing && existing instanceof TFile) return existing;
		const newPath = await this.app.fileManager.getAvailablePathForAttachment(basePath);
		return this.app.vault.create(newPath, '');
	}

	private getLinkedCardFile(titleLine: string): TFile | null {
		if (!this.file) return null;
		const linkedPath = this.getFirstWikiLinkPath(titleLine);
		if (!linkedPath) return null;
		const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkedPath, this.file.path);
		return linkedFile instanceof TFile ? linkedFile : null;
	}

	private getDisplayTitle(titleLine: string, fallback: string): string {
		return titleLine.includes('[[') ? fallback : titleLine;
	}

	private getCardTitle(cardId: string): string | null {
		return this.cardTitleById.get(cardId) ?? null;
	}

	private async handleCreateNoteFromCard(cardId: string): Promise<void> {
		if (!this.file) return;
		const title = this.getCardTitle(cardId)?.trim();
		if (!title) return;
		const { titleLine } = this.getTitleParts(title);
		if (!titleLine) return;
		const linkedCardFile = this.getLinkedCardFile(titleLine);
		if (linkedCardFile) {
			new Notice('Card already links to a file.');
			return;
		}
		const newFile = await this.ensureCardTextFile(titleLine);
		const leaf = this.app.workspace.getLeaf('split');
		await leaf.openFile(newFile);
		if (!this.board) return;
		const link = this.app.fileManager.generateMarkdownLink(newFile, this.file.path, '', titleLine);
		await this.updateCardTitleWithLink(cardId, link, title);
	}

	private getCardById(cardId: string) {
		if (!this.board) return null;
		for (const lane of this.board.lanes) {
			const card = lane.cards.find((item) => item.id === cardId);
			if (card) return card;
		}
		return null;
	}

	private async ensureCardBlockId(cardId: string): Promise<string | null> {
		const existing = this.findCardBlockId(cardId);
		if (existing) return existing;
		if (!this.board) return null;
		const nextId = this.generateBlockId();
		this.board = updateCardBlockId(this.board, cardId, nextId);
		await this.persist();
		this.render();
		return nextId;
	}

	private async handleCreateEventFromCard(cardId: string): Promise<void> {
		if (!this.file) return;
		if (!this.plugin.calendar) {
			new Notice('Calendar is not ready.');
			return;
		}
		if (!this.board) return;
		const card = this.getCardById(cardId);
		if (!card) return;

		const title = card.title.trim();
		if (!title) return;
		const { titleLine } = this.getTitleParts(title);
		if (!titleLine) return;
		const linkedCardFile = this.getLinkedCardFile(titleLine);
		const cardFile = linkedCardFile ?? (await this.ensureCardTextFile(titleLine));
		const dateKey = this.plugin.getTodayDateKey();
		const eventTitle = cardFile.basename;
		if (linkedCardFile) {
			const existingEventLink =
				typeof this.app.metadataCache.getFileCache(cardFile)?.frontmatter?.[
					KanbanView.CARD_EVENT_PROPERTY
				] === 'string'
					? (this.app.metadataCache.getFileCache(cardFile)?.frontmatter?.[
							KanbanView.CARD_EVENT_PROPERTY
						] as string)
					: '';
			if (existingEventLink.trim()) {
				new Notice('Card already links to an event.');
				return;
			}
		}

		const event = {
			title: eventTitle,
			allDay: true,
			date: dateKey,
			color: normalizeHexColor(this.board?.settings?.['kanban-color']) ?? undefined,
			creator: 'kanban' as const,
		};

		try {
			const location = await this.plugin.calendar.getCalendar().createEvent(event);
			const eventFile = this.app.vault.getAbstractFileByPath(location.file.path);
			if (eventFile && eventFile instanceof TFile) {
				const eventPropertyLink = `[[${eventFile.path}]]`;
				const cardPropertyLink = `[[${cardFile.path}]]`;
				const displayTitle = this.getDisplayTitle(titleLine, cardFile.basename);
				const cardTitleLink = `[[${cardFile.path}|${displayTitle}]]`;
				await this.setFrontmatterLink(cardFile, KanbanView.CARD_EVENT_PROPERTY, eventPropertyLink);
				await this.setFrontmatterLink(eventFile, KanbanView.EVENT_CARD_PROPERTY, cardPropertyLink);
				await this.updateCardTitleWithLink(cardId, cardTitleLink, title);
			}
			new Notice('Event created from card.');
		} catch (error) {
			console.error('Failed to create event from card', error);
			new Notice('Failed to create event from card.');
		}
	}

	private async handleCopyCardLink(cardId: string): Promise<void> {
		if (!this.file) return;
		const title = this.getCardTitle(cardId)?.trim() ?? '';
		const { titleLine } = this.getTitleParts(title);
		const eventPath = titleLine ? this.getFirstWikiLinkPath(titleLine) : null;
		if (eventPath) {
			const eventFile = this.app.metadataCache.getFirstLinkpathDest(eventPath, this.file.path);
			if (eventFile && eventFile instanceof TFile) {
				const frontmatter = this.app.metadataCache.getFileCache(eventFile)?.frontmatter;
				const cardLink = frontmatter?.[KanbanView.EVENT_CARD_PROPERTY];
				if (typeof cardLink === 'string' && cardLink.trim()) {
					await navigator.clipboard.writeText(cardLink.trim());
					return;
				}
			}
		}
		const existingBlockId = this.findCardBlockId(cardId);
		if (existingBlockId) {
			const fallbackLink = this.app.fileManager.generateMarkdownLink(
				this.file,
				'',
				`#^${existingBlockId}`,
			);
			await navigator.clipboard.writeText(fallbackLink);
			return;
		}
		if (!this.board) return;
		const nextId = this.generateBlockId();
		this.board = updateCardBlockId(this.board, cardId, nextId);
		await this.persist();
		this.render();
		const fallbackLink = this.app.fileManager.generateMarkdownLink(this.file, '', `#^${nextId}`);
		await navigator.clipboard.writeText(fallbackLink);
	}

	private findCardBlockId(cardId: string): string | null {
		if (!this.board) return null;
		for (const lane of this.board.lanes) {
			const card = lane.cards.find((item) => item.id === cardId);
			if (card?.blockId) return card.blockId;
		}
		return null;
	}

	private generateBlockId(): string {
		const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
		let next = '';
		for (let i = 0; i < 6; i += 1) {
			next += alphabet[Math.floor(Math.random() * alphabet.length)];
		}
		return next;
	}

	async handleMoveCard(cardId: string, laneId: string, index: number): Promise<void> {
		if (!this.board) return;
		this.board = moveCard(this.board, cardId, laneId, index);
		await this.persist();
		this.render();
	}

	async persist(): Promise<void> {
		if (!this.board) return;
		const updated = serializeKanbanBoard(this.board, this.data ?? '');
		if (!this.file) {
			new Notice('Kanban board file not found.');
			return;
		}
		this.data = updated;
		this.requestSave();
	}
}
