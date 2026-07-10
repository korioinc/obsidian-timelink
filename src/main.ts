import { CALENDAR_VIEW_TYPE } from './calendar/constants';
import { TimeLinkCalendar } from './calendar/services/model-service';
import { TimeLinkCalendarView } from './calendar/view.tsx';
import { registerKanbanCommands } from './commands/kanban';
import { GANTT_VIEW_TYPE } from './gantt/constants';
import { TimeLinkGanttView } from './gantt/view/index';
import { KANBAN_LIST_VIEW_TYPE } from './kanban-list/constants';
import { TimeLinkKanbanListView } from './kanban-list/view/index';
import { KANBAN_VIEW_TYPE } from './kanban/constants';
import { KanbanManager } from './kanban/services/manager-service';
import {
	KanbanMarkdownModeTracker,
	openTrackedMarkdownView,
} from './kanban/services/markdown-mode-service';
import { KanbanRibbonController } from './kanban/services/ribbon-service';
import {
	cleanupMissingTimelinkEventProperties,
	hasStartupCleanupChanges,
} from './kanban/services/startup-cleanup-service';
import { registerKanbanWorkspaceIntegration } from './kanban/services/workspace-integration-service';
import { openCreateKanbanModal } from './kanban/view/modal';
import { TimeLinkSettingTab } from './settings';
import {
	normalizeCalendarFolderPath,
	normalizeTimeLinkSettings,
	type TimeLinkSettings,
} from './settings-model';
import { formatDateKey } from './shared/event/model-utils';
import {
	KANBAN_FRONTMATTER_KEY,
	KANBAN_FRONTMATTER_VALUE,
} from './shared/frontmatter/kanban-frontmatter';
import { openOrRevealPluginView } from './shared/view/open-plugin-view';
import { TIMELINE_VIEW_ICON, TIMELINE_VIEW_TYPE } from './timeline/constants';
import { TimeLinkTimelineView } from './timeline/view.tsx';
import { Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';

export default class TimeLinkPlugin extends Plugin {
	settings!: TimeLinkSettings;
	calendar!: TimeLinkCalendar;
	kanbanManager!: KanbanManager;
	private readonly kanbanMarkdownModes = new KanbanMarkdownModeTracker();
	private kanbanRibbons: KanbanRibbonController | null = null;
	private startupCleanupStarted = false;
	private settingsUpdateQueue: Promise<void> = Promise.resolve();
	private isUnloaded = false;
	getTodayDateKey(): string {
		return formatDateKey(new Date());
	}
	async onload() {
		this.isUnloaded = false;
		await this.loadSettings();
		this.calendar = new TimeLinkCalendar(this, this.settings.calendarFolderPath);

		this.registerView(CALENDAR_VIEW_TYPE, (leaf) => new TimeLinkCalendarView(leaf, this));
		this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimeLinkTimelineView(leaf, this));
		this.registerView(GANTT_VIEW_TYPE, (leaf) => new TimeLinkGanttView(leaf, this));
		this.registerView(KANBAN_LIST_VIEW_TYPE, (leaf) => new TimeLinkKanbanListView(leaf, this));

		this.registerExtensions(['kanban'], 'markdown');

		this.kanbanManager = new KanbanManager(this);
		this.kanbanManager.registerView();
		this.kanbanRibbons = new KanbanRibbonController(this, {
			onCreateBoard: () => openCreateKanbanModal(this),
			onOpenBoardList: () =>
				this.runWorkspaceAction('Failed to open kanban list', 'Failed to open kanban list.', () =>
					this.openKanbanListView(),
				),
			onOpenGantt: () =>
				this.runWorkspaceAction('Failed to open gantt', 'Failed to open gantt.', () =>
					this.openGanttView(),
				),
		});
		registerKanbanWorkspaceIntegration({
			app: this.app,
			markdownModes: this.kanbanMarkdownModes,
			isKanbanEnabled: () => this.settings.enableKanban,
			openBoard: (file) => this.kanbanManager.openBoard(file),
			openCreateBoard: (folderPath) => openCreateKanbanModal(this, folderPath),
			setKanbanView: (leaf) => this.setKanbanView(leaf),
			registerCleanup: (cleanup) => this.register(cleanup),
			registerEvent: (event) => this.registerEvent(event),
		});

		registerKanbanCommands(this);

		await this.syncKanbanState();

		this.addRibbonIcon('calendar', 'Open calendar', () => {
			this.runWorkspaceAction('Failed to open calendar', 'Failed to open calendar.', () =>
				this.openCalendarView(),
			);
		});

		this.addRibbonIcon(TIMELINE_VIEW_ICON, 'Open timeline', () => {
			this.runWorkspaceAction('Failed to open timeline', 'Failed to open timeline.', () =>
				this.openTimelineView(),
			);
		});

		this.addCommand({
			id: 'open-timeline',
			name: 'Open timeline',
			callback: () => {
				this.runWorkspaceAction('Failed to open timeline', 'Failed to open timeline.', () =>
					this.openTimelineView(),
				);
			},
		});

		this.addSettingTab(new TimeLinkSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			void this.runStartupCleanupOnce();
		});
	}

	private runWorkspaceAction(
		label: string,
		failureMessage: string,
		action: () => Promise<void>,
	): void {
		void action().catch((error: unknown) => {
			console.error(label, error);
			new Notice(failureMessage);
		});
	}

	private async runStartupCleanupOnce(): Promise<void> {
		if (this.isUnloaded || this.startupCleanupStarted || !this.settings.enableKanban) return;
		this.startupCleanupStarted = true;
		try {
			const result = await cleanupMissingTimelinkEventProperties(this.app);
			if (this.isUnloaded || !hasStartupCleanupChanges(result)) return;
			new Notice(`Cleaned ${result.brokenEventLinks} broken event link(s).`);
		} catch (error) {
			console.error('Failed to clean broken TimeLink event links', error);
			if (!this.isUnloaded) new Notice('Failed to clean broken event links.');
		}
	}

	private async openCalendarView(): Promise<void> {
		await openOrRevealPluginView(
			this.app,
			CALENDAR_VIEW_TYPE,
			'tab',
			'Unable to open calendar view.',
		);
	}

	private async openTimelineView(): Promise<void> {
		await openOrRevealPluginView(
			this.app,
			TIMELINE_VIEW_TYPE,
			'right',
			'Unable to open timeline view.',
		);
	}

	private async openGanttView(): Promise<void> {
		await openOrRevealPluginView(this.app, GANTT_VIEW_TYPE, 'tab', 'Unable to open gantt view.');
	}

	async openKanbanBoard(boardPath: string): Promise<void> {
		const target = this.app.vault.getAbstractFileByPath(boardPath);
		if (!(target instanceof TFile)) {
			new Notice('Kanban board file not found.');
			return;
		}
		await this.kanbanManager.openBoard(target);
	}

	private async openKanbanListView(): Promise<void> {
		await openOrRevealPluginView(
			this.app,
			KANBAN_LIST_VIEW_TYPE,
			'tab',
			'Unable to open kanban list view.',
		);
	}

	onunload() {
		this.isUnloaded = true;
		void Promise.allSettled(
			this.app.workspace
				.getLeavesOfType(KANBAN_VIEW_TYPE)
				.map((leaf) => this.setMarkdownView(leaf)),
		).finally(() => this.kanbanMarkdownModes.clearAll());
		this.kanbanRibbons?.hide();
	}

	async setMarkdownView(leaf: WorkspaceLeaf): Promise<void> {
		const leafId = String((leaf as { id?: string }).id ?? '');
		const state = leaf.view?.getState?.() ?? {};
		const filePath = (state as { file?: string }).file;
		if (filePath) this.kanbanMarkdownModes.set(leafId, filePath, 'editing');
		try {
			await leaf.setViewState({ type: 'markdown', state });
		} finally {
			this.kanbanMarkdownModes.clear(leafId);
		}
	}

	async openKanbanAsMarkdown(leaf: WorkspaceLeaf, options: { readOnly: boolean }): Promise<void> {
		await openTrackedMarkdownView(this.kanbanMarkdownModes, leaf, options);
	}

	async setKanbanView(leaf: WorkspaceLeaf): Promise<void> {
		if (this.isUnloaded) return;
		const leafId = String((leaf as { id?: string }).id ?? '');
		if (leafId) {
			this.kanbanMarkdownModes.clear(leafId);
		}
		await leaf.setViewState({
			type: KANBAN_VIEW_TYPE,
			state: leaf.view?.getState?.() ?? {},
		});
		if (this.isUnloaded) {
			await this.setMarkdownView(leaf);
		}
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
			return cache?.frontmatter?.[KANBAN_FRONTMATTER_KEY] === KANBAN_FRONTMATTER_VALUE;
		});
		await Promise.allSettled(targets.map((leaf) => this.setKanbanView(leaf)));
	}

	async loadSettings() {
		this.settings = normalizeTimeLinkSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private enqueueSettingsUpdate(update: () => Promise<void>): Promise<void> {
		const result = this.settingsUpdateQueue.then(update);
		this.settingsUpdateQueue = result.catch(() => undefined);
		return result;
	}

	async updateCalendarFolderPath(value: string): Promise<void> {
		const calendarFolderPath = normalizeCalendarFolderPath(value);
		return this.enqueueSettingsUpdate(async () => {
			if (calendarFolderPath === this.settings.calendarFolderPath) return;

			const previousSettings = this.settings;
			this.settings = { ...this.settings, calendarFolderPath };
			try {
				await this.saveSettings();
			} catch (error) {
				this.settings = previousSettings;
				throw error;
			}
			if (!this.isUnloaded) {
				this.calendar.getCalendar().setDirectory(calendarFolderPath);
			}
		});
	}

	async updateKanbanEnabled(enableKanban: boolean): Promise<void> {
		return this.enqueueSettingsUpdate(async () => {
			if (enableKanban === this.settings.enableKanban) return;

			const previousSettings = this.settings;
			this.settings = { ...this.settings, enableKanban };
			try {
				await this.saveSettings();
			} catch (error) {
				this.settings = previousSettings;
				throw error;
			}
			if (!this.isUnloaded) {
				await this.syncKanbanState();
			}
		});
	}

	async syncKanbanState(): Promise<void> {
		if (this.isUnloaded) return;
		if (!this.settings.enableKanban) {
			const leaves = this.app.workspace.getLeavesOfType(KANBAN_VIEW_TYPE);
			await Promise.allSettled(leaves.map((leaf) => this.setMarkdownView(leaf)));
			this.kanbanMarkdownModes.clearAll();
			this.kanbanRibbons?.hide();
			return;
		}
		this.kanbanRibbons?.show();
		await this.restoreKanbanLeaves();
	}
}
