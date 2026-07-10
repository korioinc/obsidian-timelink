import {
	KANBAN_FRONTMATTER_KEY,
	KANBAN_FRONTMATTER_VALUE,
} from '../../shared/frontmatter/kanban-frontmatter';
import { around, invokeAround } from '../../utils/around';
import { KANBAN_ICON, KANBAN_VIEW_TYPE } from '../constants';
import {
	inspectKanbanBoardFile,
	readCachedKanbanMarker,
	resolveKanbanOpenDecision,
} from './board-open-policy';
import type { KanbanMarkdownModeTracker } from './markdown-mode-service';
import {
	MarkdownView,
	TFile,
	TFolder,
	type App,
	type EventRef,
	type Menu,
	WorkspaceLeaf,
} from 'obsidian';

type KanbanWorkspaceIntegrationOptions = {
	app: App;
	markdownModes: KanbanMarkdownModeTracker;
	isKanbanEnabled: () => boolean;
	openBoard: (file: TFile) => Promise<void>;
	openCreateBoard: (folderPath?: string) => void;
	setKanbanView: (leaf: WorkspaceLeaf) => Promise<void>;
	registerCleanup: (cleanup: () => void) => void;
	registerEvent: (event: EventRef) => void;
};

const getLeafId = (leaf: WorkspaceLeaf): string =>
	String((leaf as WorkspaceLeaf & { id?: string }).id ?? '');

const hasCachedKanbanFrontmatter = (app: App, file: TFile): boolean | null => {
	return readCachedKanbanMarker(app.metadataCache.getFileCache(file));
};

const isKanbanFile = async (app: App, file: TFile): Promise<boolean> => {
	const cached = hasCachedKanbanFrontmatter(app, file);
	return inspectKanbanBoardFile(file.extension, cached, () => app.vault.cachedRead(file));
};

const runAsyncAction = (label: string, action: () => Promise<void>): void => {
	void action().catch((error: unknown) => {
		console.error(label, error);
	});
};

export const registerKanbanWorkspaceIntegration = ({
	app,
	markdownModes,
	isKanbanEnabled,
	openBoard,
	openCreateBoard,
	setKanbanView,
	registerCleanup,
	registerEvent,
}: KanbanWorkspaceIntegrationOptions): void => {
	let fileOpenGeneration = 0;
	let disposed = false;
	registerCleanup(() => {
		disposed = true;
		fileOpenGeneration += 1;
	});
	registerEvent(
		app.workspace.on('file-open', (file: TFile | null) => {
			const generation = ++fileOpenGeneration;
			if (disposed || !file || !isKanbanEnabled()) return;
			if (file.extension !== 'md' && file.extension !== 'kanban') return;
			runAsyncAction('Failed to open kanban board', async () => {
				if (!(await isKanbanFile(app, file))) return;
				if (disposed || !isKanbanEnabled() || generation !== fileOpenGeneration) return;
				await openBoard(file);
			});
		}),
	);

	registerEvent(
		app.workspace.on('file-menu', (menu: Menu, file) => {
			if (!isKanbanEnabled()) return;
			if (file instanceof TFolder) {
				menu.addItem((item) => {
					item.setTitle('New kanban board');
					item.setIcon(KANBAN_ICON);
					item.onClick(() => {
						if (!disposed && isKanbanEnabled()) openCreateBoard(file.path);
					});
				});
				return;
			}
			if (!(file instanceof TFile)) return;
			const cachedMarker = hasCachedKanbanFrontmatter(app, file);
			const decision = resolveKanbanOpenDecision(file.extension, cachedMarker);
			if (decision !== 'allow') return;
			menu.addItem((item) => {
				item.setTitle('Open as kanban board');
				item.setIcon(KANBAN_ICON);
				item.onClick(() => {
					if (disposed || !isKanbanEnabled()) return;
					runAsyncAction('Failed to open kanban board', () => openBoard(file));
				});
			});
		}),
	);

	registerCleanup(
		around(WorkspaceLeaf.prototype, {
			detach: (next) =>
				function (this: WorkspaceLeaf) {
					markdownModes.clear(getLeafId(this));
					return invokeAround(next, this);
				},
			setViewState: (next) =>
				function (
					this: WorkspaceLeaf,
					state: { type?: string; state?: { file?: string; mode?: string } },
					...rest: unknown[]
				) {
					if (!state || state.type !== 'markdown' || !state.state?.file) {
						return invokeAround(next, this, [state, ...rest]);
					}
					if (!isKanbanEnabled()) {
						return invokeAround(next, this, [state, ...rest]);
					}

					const leafId = getLeafId(this);
					const filePath = state.state.file;
					const markdownMode = markdownModes.get(leafId, filePath);
					if (markdownMode === 'readonly' && state.state.mode !== 'source') {
						const nextState = { ...state, state: { ...state.state, mode: 'preview' } };
						return invokeAround(next, this, [nextState, ...rest]);
					}
					if (markdownMode === 'readonly' && state.state.mode === 'source') {
						markdownModes.set(leafId, filePath, 'editing');
					}

					const cache = app.metadataCache.getCache(filePath);
					const isKanban =
						cache?.frontmatter?.[KANBAN_FRONTMATTER_KEY] === KANBAN_FRONTMATTER_VALUE;
					if (isKanban && !markdownMode) {
						return invokeAround(next, this, [{ ...state, type: KANBAN_VIEW_TYPE }, ...rest]);
					}

					return invokeAround(next, this, [state, ...rest]);
				},
		}),
	);

	registerCleanup(
		around(MarkdownView.prototype, {
			onPaneMenu: (next) =>
				function (this: MarkdownView, menu: Menu, source: string) {
					if (source === 'more-options' && isKanbanEnabled()) {
						const file = this.file;
						const cache = file ? app.metadataCache.getFileCache(file) : null;
						const isKanban =
							cache?.frontmatter?.[KANBAN_FRONTMATTER_KEY] === KANBAN_FRONTMATTER_VALUE;
						if (isKanban) {
							menu.addItem((item) => {
								item.setTitle('Open as kanban board');
								item.setIcon(KANBAN_ICON);
								item.setSection('pane');
								item.onClick(() => {
									if (disposed || !isKanbanEnabled()) return;
									runAsyncAction('Failed to switch to kanban view', () => setKanbanView(this.leaf));
								});
							});
						}
					}

					return invokeAround(next, this, [menu, source]);
				},
		}),
	);
};
