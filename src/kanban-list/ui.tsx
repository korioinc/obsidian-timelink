import type TimeLinkPlugin from '../main';
import { KANBAN_LIST_MAX_DEPTH } from './constants';
import { collectKanbanBoards } from './service';
import type { KanbanListItem } from './types';
import { Notice, type App, TAbstractFile, TFile, type Vault } from 'obsidian';
import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

const isWithinDepth = (file: TAbstractFile, maxDepth: number): boolean => {
	const folderPath = file.parent?.path ?? '';
	if (!folderPath.trim()) return true;
	return folderPath.split('/').filter(Boolean).length <= maxDepth;
};

const registerKanbanListRefresh = (
	vault: Vault,
	maxDepth: number,
	onReload: () => void,
): (() => void) => {
	const onVaultChange = (file: TAbstractFile) => {
		if (!isWithinDepth(file, maxDepth)) return;
		onReload();
	};

	vault.on('create', onVaultChange);
	vault.on('modify', onVaultChange);
	vault.on('delete', onVaultChange);
	vault.on('rename', onVaultChange);

	return () => {
		vault.off('create', onVaultChange);
		vault.off('modify', onVaultChange);
		vault.off('delete', onVaultChange);
		vault.off('rename', onVaultChange);
	};
};

type KanbanListUIProps = {
	app: App;
	plugin: TimeLinkPlugin;
};

const KanbanListRoot = ({ app, plugin }: KanbanListUIProps) => {
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [items, setItems] = useState<KanbanListItem[]>([]);
	const reloadTimerRef = useRef<number | null>(null);
	const refreshFeedbackTimerRef = useRef<number | null>(null);

	const clearRefreshFeedbackTimer = useCallback(() => {
		if (refreshFeedbackTimerRef.current !== null) {
			window.clearTimeout(refreshFeedbackTimerRef.current);
			refreshFeedbackTimerRef.current = null;
		}
	}, []);

	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
			}),
		[],
	);

	const reloadList = useCallback(
		async (manual = false) => {
			const startedAt = Date.now();
			if (manual) {
				clearRefreshFeedbackTimer();
				setIsRefreshing(true);
			}
			setErrorMessage(null);
			setIsLoading(true);
			try {
				const nextItems = await collectKanbanBoards(app, KANBAN_LIST_MAX_DEPTH);
				setItems(nextItems);
			} catch (error) {
				console.error('Failed to collect kanban boards', error);
				setErrorMessage('Failed to load kanban boards.');
			} finally {
				setIsLoading(false);
				if (manual) {
					const elapsed = Date.now() - startedAt;
					const remaining = 320 - elapsed;
					if (remaining > 0) {
						refreshFeedbackTimerRef.current = window.setTimeout(() => {
							refreshFeedbackTimerRef.current = null;
							setIsRefreshing(false);
						}, remaining);
					} else {
						setIsRefreshing(false);
					}
				}
			}
		},
		[app, clearRefreshFeedbackTimer],
	);

	const scheduleReload = useCallback(() => {
		if (reloadTimerRef.current !== null) {
			window.clearTimeout(reloadTimerRef.current);
		}
		reloadTimerRef.current = window.setTimeout(() => {
			reloadTimerRef.current = null;
			void reloadList();
		}, 150);
	}, [reloadList]);

	useEffect(() => {
		void reloadList();
		return () => {
			if (reloadTimerRef.current !== null) {
				window.clearTimeout(reloadTimerRef.current);
			}
			clearRefreshFeedbackTimer();
		};
	}, [clearRefreshFeedbackTimer, reloadList]);

	useEffect(() => {
		return registerKanbanListRefresh(app.vault, KANBAN_LIST_MAX_DEPTH, scheduleReload);
	}, [app.vault, scheduleReload]);

	const handleOpenBoard = useCallback(
		(item: KanbanListItem) => {
			const target = app.vault.getAbstractFileByPath(item.path);
			if (!(target instanceof TFile)) {
				new Notice('Kanban file not found.');
				void scheduleReload();
				return;
			}
			void plugin.kanbanManager.openBoard(target);
		},
		[app.vault, plugin.kanbanManager, scheduleReload],
	);

	return (
		<div className="flex h-full w-full flex-col overflow-hidden p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<div className="text-lg font-semibold">Kanban boards</div>
				<button
					type="button"
					disabled={isRefreshing}
					aria-busy={isRefreshing}
					className={`!cursor-pointer rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 py-1.5 text-xs font-medium text-[color:var(--text-normal)] transition hover:bg-[var(--background-secondary-alt)] active:translate-y-[1px] ${
						isRefreshing ? 'opacity-60' : ''
					}`}
					onClick={() => {
						void reloadList(true);
					}}
				>
					<span className="inline-flex items-center gap-1.5">
						{isRefreshing ? (
							<span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--text-normal)]" />
						) : null}
						{isRefreshing ? 'Refreshing...' : 'Refresh'}
					</span>
				</button>
			</div>
			<div className="mb-4 text-xs text-[color:var(--text-muted)]">
				Only notes with `kanban-plugin` inside depth {KANBAN_LIST_MAX_DEPTH} are shown.
			</div>
			{isLoading ? (
				<div className="mt-8 rounded-lg border border-dashed border-[var(--background-modifier-border)] p-4 text-sm text-[color:var(--text-muted)]">
					Loading kanban boards...
				</div>
			) : errorMessage ? (
				<div className="mt-8 rounded-lg border border-dashed border-[var(--background-modifier-error)] p-4 text-sm text-[color:var(--text-error)]">
					{errorMessage}
				</div>
			) : items.length === 0 ? (
				<div className="mt-8 rounded-lg border border-dashed border-[var(--background-modifier-border)] p-4 text-sm text-[color:var(--text-muted)]">
					No kanban boards found.
				</div>
			) : (
				<div className="grid grid-cols-1 gap-3 overflow-y-auto pb-2 md:grid-cols-2 lg:grid-cols-4">
					{items.map((item) => (
						<div
							key={item.path}
							role="button"
							tabIndex={0}
							className="flex w-full cursor-pointer flex-col items-start gap-1 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-3 text-left transition hover:border-[var(--interactive-accent)] hover:bg-[var(--background-secondary-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
							onDblClick={() => {
								handleOpenBoard(item);
							}}
							onKeyDown={(event) => {
								if (event.key !== 'Enter') return;
								event.preventDefault();
								handleOpenBoard(item);
							}}
						>
							<div className="flex w-full items-center gap-2">
								<span
									className="inline-flex h-[10px] w-[10px] shrink-0 rounded-full border"
									style={{
										backgroundColor: item.kanbanColor ?? 'transparent',
										borderColor: item.kanbanColor
											? 'var(--background-modifier-border)'
											: 'var(--text-faint)',
									}}
								/>
								<div className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--text-normal)]">
									{item.basename}
								</div>
							</div>
							<div className="w-full truncate text-xs text-[color:var(--text-muted)]">
								{`(D${item.folderDepth}) ${item.path}`}
							</div>
							<div className="w-full text-[11px] text-[color:var(--text-faint)]">
								{dateFormatter.format(item.mtime)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export const mountKanbanListUI = (
	containerEl: HTMLElement,
	app: App,
	plugin: TimeLinkPlugin,
): void => {
	render(<KanbanListRoot app={app} plugin={plugin} />, containerEl);
};

export const unmountKanbanListUI = (containerEl: HTMLElement): void => {
	render(null, containerEl);
};
