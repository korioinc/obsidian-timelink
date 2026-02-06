import { TimeLinkCalendar } from './calendar/calendar';
import { CALENDAR_VIEW_TYPE } from './calendar/constants';
import { formatDateKey } from './calendar/utils/month-calendar-utils';
import { TimeLinkCalendarView } from './calendar/view';
import { registerKanbanCommands } from './commands/kanban';
import { KANBAN_LIST_VIEW_ICON, KANBAN_LIST_VIEW_TYPE } from './kanban-list/constants';
import { TimeLinkKanbanListView } from './kanban-list/view';
import {
	KANBAN_FRONTMATTER_KEY,
	KANBAN_FRONTMATTER_VALUE,
	KANBAN_ICON,
	KANBAN_VIEW_TYPE,
} from './kanban/constants';
import { KanbanManager } from './kanban/manager';
import { openCreateKanbanModal } from './kanban/modal';
import { DEFAULT_SETTINGS, TimeLinkSettingTab, TimeLinkSettings } from './settings';
import { TIMELINE_VIEW_ICON, TIMELINE_VIEW_TYPE } from './timeline/constants';
import { TimeLinkTimelineView } from './timeline/view';
import { around } from './utils/around';
import { MarkdownView, Menu, Notice, Plugin, TFile, TFolder, WorkspaceLeaf } from 'obsidian';

export default class TimeLinkPlugin extends Plugin {
	settings: TimeLinkSettings;
	calendar: TimeLinkCalendar;
	kanbanManager: KanbanManager;
	private kanbanMarkdownModes = new Map<string, 'readonly' | 'editing'>();
	private kanbanLeafFilePaths = new Map<string, string>();
	private kanbanRibbonIcon: HTMLElement | null = null;
	private kanbanListRibbonIcon: HTMLElement | null = null;
	getTodayDateKey(): string {
		return formatDateKey(new Date());
	}
	async onload() {
		await this.loadSettings();
		this.calendar = new TimeLinkCalendar(this, this.settings.calendarFolderPath);

		this.registerView(CALENDAR_VIEW_TYPE, (leaf) => new TimeLinkCalendarView(leaf, this));
		this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimeLinkTimelineView(leaf, this));
		this.registerView(KANBAN_LIST_VIEW_TYPE, (leaf) => new TimeLinkKanbanListView(leaf, this));

		this.registerExtensions(['kanban'], 'markdown');

		const app = this.app;
		const kanbanMarkdownModes = this.kanbanMarkdownModes;
		const kanbanLeafFilePaths = this.kanbanLeafFilePaths;
		const clearKanbanLeafTracking = (leafId: string) => this.clearKanbanLeafTracking(leafId);
		const setKanbanView = (leaf: WorkspaceLeaf) => this.setKanbanView(leaf);
		const isKanbanEnabled = () => this.settings.enableKanban;
		this.kanbanManager = new KanbanManager(this);
		this.kanbanManager.registerView();

		registerKanbanCommands(this);

		await this.syncKanbanState();

		this.addRibbonIcon('calendar', 'Open calendar', () => {
			void this.openCalendarView();
		});

		this.addRibbonIcon(TIMELINE_VIEW_ICON, 'Open timeline', () => {
			void this.openTimelineView();
		});

		this.addCommand({
			id: 'open-timeline',
			name: 'Open timeline',
			callback: () => {
				void this.openTimelineView();
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-open', (file: TFile | null) => {
				void (async () => {
					if (!file || !this.settings.enableKanban) return;
					const content = await this.app.vault.read(file);
					if (content.includes(`${KANBAN_FRONTMATTER_KEY}: ${KANBAN_FRONTMATTER_VALUE}`)) {
						await this.kanbanManager.openBoard(file);
					}
				})();
			}),
		);

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file) => {
				if (!this.settings.enableKanban) return;
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item.setTitle('New kanban board');
						item.setIcon('lucide-trello');
						item.onClick(() => openCreateKanbanModal(this, file.path));
					});
				} else if (file instanceof TFile && file.extension === 'md') {
					menu.addItem((item) => {
						item.setTitle('Open as kanban board');
						item.setIcon('lucide-trello');
						item.onClick(() => this.kanbanManager.openBoard(file));
					});
				}
			}),
		);

		this.register(
			around(WorkspaceLeaf.prototype, {
				detach: (next) =>
					function (this: WorkspaceLeaf) {
						const leafId = String((this as { id?: string }).id ?? '');
						if (leafId) {
							clearKanbanLeafTracking(leafId);
						}
						return next.apply(this);
					},
				setViewState: (next) =>
					function (
						this: WorkspaceLeaf,
						state: { type?: string; state?: { file?: string; mode?: string } },
						...rest: unknown[]
					) {
						if (!state || state.type !== 'markdown' || !state.state?.file) {
							return next.apply(this, [state, ...rest]);
						}
						if (!isKanbanEnabled()) {
							return next.apply(this, [state, ...rest]);
						}

						const leafId = String((this as { id?: string }).id ?? '');
						const filePath = state.state.file;

						if (leafId) {
							kanbanLeafFilePaths.set(leafId, filePath);
							const mode = kanbanMarkdownModes.get(leafId);
							if (mode === 'readonly' && state.state?.mode !== 'source') {
								const nextState = { ...state, state: { ...state.state, mode: 'preview' } };
								return next.apply(this, [nextState, ...rest]);
							}
							if (mode === 'readonly' && state.state?.mode === 'source') {
								kanbanMarkdownModes.set(leafId, 'editing');
							}
						}

						const cache = app.metadataCache.getCache(filePath);
						if (cache?.frontmatter && cache.frontmatter[KANBAN_FRONTMATTER_KEY]) {
							const allowMarkdown = kanbanMarkdownModes.get(leafId);
							if (!allowMarkdown) {
								const nextState = { ...state, type: KANBAN_VIEW_TYPE };
								return next.apply(this, [nextState, ...rest]);
							}
						}

						return next.apply(this, [state, ...rest]);
					},
			}),
		);

		this.register(
			around(MarkdownView.prototype, {
				onPaneMenu: (next) =>
					function (this: MarkdownView, menu: Menu, source: string) {
						if (source === 'more-options' && isKanbanEnabled()) {
							const file = this.file;
							if (file) {
								const cache = app.metadataCache.getFileCache(file);
								if (cache?.frontmatter && cache.frontmatter[KANBAN_FRONTMATTER_KEY]) {
									menu.addItem((item) => {
										item.setTitle('Open as kanban board');
										item.setIcon(KANBAN_ICON);
										item.setSection('pane');
										item.onClick(() => {
											void setKanbanView(this.leaf);
										});
									});
								}
							}
						}

						return next.apply(this, [menu, source]);
					},
			}),
		);

		this.addSettingTab(new TimeLinkSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => void this.initTimelineLeafSilently());
	}

	private async openCalendarView(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE);
		const existingLeaf = leaves[0];
		if (existingLeaf) {
			void this.app.workspace.revealLeaf(existingLeaf);
			return;
		}
		const leaf = this.app.workspace.getLeaf('tab') ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			new Notice('Unable to open calendar view.');
			return;
		}
		await leaf.setViewState({ type: CALENDAR_VIEW_TYPE, active: true });
		void this.app.workspace.revealLeaf(leaf);
	}

	private async openTimelineView(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
		const existingLeaf = leaves[0];
		if (existingLeaf) {
			void this.app.workspace.revealLeaf(existingLeaf);
			return;
		}
		const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf('tab');
		if (!leaf) {
			new Notice('Unable to open timeline view.');
			return;
		}
		await leaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
		void this.app.workspace.revealLeaf(leaf);
	}

	private async openKanbanListView(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(KANBAN_LIST_VIEW_TYPE);
		const existingLeaf = leaves[0];
		if (existingLeaf) {
			void this.app.workspace.revealLeaf(existingLeaf);
			return;
		}
		const leaf = this.app.workspace.getLeaf('tab') ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			new Notice('Unable to open kanban list view.');
			return;
		}
		await leaf.setViewState({ type: KANBAN_LIST_VIEW_TYPE, active: true });
		void this.app.workspace.revealLeaf(leaf);
	}

	private async initTimelineLeafSilently(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
		if (leaves.length > 0) {
			return;
		}
		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			return;
		}
		await leaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: false });
	}

	onunload() {
		void Promise.allSettled(
			this.app.workspace
				.getLeavesOfType(KANBAN_VIEW_TYPE)
				.map((leaf) => this.setMarkdownView(leaf)),
		);
		this.kanbanMarkdownModes.clear();
		this.kanbanLeafFilePaths.clear();
		this.removeKanbanRibbonIcon();
		this.removeKanbanListRibbonIcon();
	}

	async setMarkdownView(leaf: WorkspaceLeaf): Promise<void> {
		await leaf.setViewState({
			type: 'markdown',
			state: leaf.view?.getState?.() ?? {},
		});
	}

	async openKanbanAsMarkdown(leaf: WorkspaceLeaf, options: { readOnly: boolean }): Promise<void> {
		const leafId = String((leaf as { id?: string }).id ?? '');
		const state = leaf.view?.getState?.() ?? {};
		const filePath =
			(state as { file?: string }).file ??
			(leaf.view instanceof MarkdownView ? leaf.view.file?.path : undefined);

		if (leafId) {
			this.kanbanMarkdownModes.set(leafId, options.readOnly ? 'readonly' : 'editing');
			if (filePath) {
				this.kanbanLeafFilePaths.set(leafId, filePath);
			}
		}

		const nextState = options.readOnly ? { ...state, mode: 'preview' } : state;

		await leaf.setViewState({
			type: 'markdown',
			state: nextState,
		});
	}

	async setKanbanView(leaf: WorkspaceLeaf): Promise<void> {
		const leafId = String((leaf as { id?: string }).id ?? '');
		if (leafId) {
			this.kanbanMarkdownModes.delete(leafId);
			this.kanbanLeafFilePaths.delete(leafId);
		}
		await leaf.setViewState({
			type: KANBAN_VIEW_TYPE,
			state: leaf.view?.getState?.() ?? {},
		});
	}

	clearKanbanLeafTracking(leafId: string): void {
		this.kanbanMarkdownModes.delete(leafId);
		this.kanbanLeafFilePaths.delete(leafId);
	}

	private async restoreKanbanLeaves(): Promise<void> {
		if (!this.settings.enableKanban) {
			return;
		}
		const leaves = this.app.workspace.getLeavesOfType('markdown');
		const targets = leaves.filter((leaf) => {
			const file = (leaf.view as { file?: TFile | null }).file;
			if (!file) return false;
			const cache = this.app.metadataCache.getFileCache(file);
			return Boolean(cache?.frontmatter && cache.frontmatter[KANBAN_FRONTMATTER_KEY]);
		});
		await Promise.allSettled(targets.map((leaf) => this.setKanbanView(leaf)));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TimeLinkSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async syncKanbanState(): Promise<void> {
		if (!this.settings.enableKanban) {
			const leaves = this.app.workspace.getLeavesOfType(KANBAN_VIEW_TYPE);
			await Promise.allSettled(leaves.map((leaf) => this.setMarkdownView(leaf)));
			this.kanbanMarkdownModes.clear();
			this.kanbanLeafFilePaths.clear();
			this.removeKanbanRibbonIcon();
			this.removeKanbanListRibbonIcon();
			return;
		}
		this.ensureKanbanRibbonIcon();
		this.ensureKanbanListRibbonIcon();
		await this.restoreKanbanLeaves();
	}

	private ensureKanbanRibbonIcon(): void {
		if (this.kanbanRibbonIcon) return;
		this.kanbanRibbonIcon = this.addRibbonIcon('lucide-trello', 'Create kanban board', () => {
			openCreateKanbanModal(this);
		});
	}

	private ensureKanbanListRibbonIcon(): void {
		if (this.kanbanListRibbonIcon) return;
		this.kanbanListRibbonIcon = this.addRibbonIcon(
			KANBAN_LIST_VIEW_ICON,
			'Open kanban list',
			() => {
				void this.openKanbanListView();
			},
		);
	}

	private removeKanbanRibbonIcon(): void {
		if (!this.kanbanRibbonIcon) return;
		this.kanbanRibbonIcon.remove();
		this.kanbanRibbonIcon = null;
	}

	private removeKanbanListRibbonIcon(): void {
		if (!this.kanbanListRibbonIcon) return;
		this.kanbanListRibbonIcon.remove();
		this.kanbanListRibbonIcon = null;
	}
}
