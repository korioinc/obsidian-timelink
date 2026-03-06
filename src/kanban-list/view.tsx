import { KanbanBoardCard } from './_components/kanban-board-card';
import { KANBAN_LIST_MAX_DEPTH } from './constants';
import { useKanbanListData } from './hooks/use-kanban-list-data';
import type { KanbanListPluginContext } from './types';
import { Notice, TFile } from 'obsidian';
import { render } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';

type KanbanListUIProps = {
	plugin: KanbanListPluginContext;
};

const KanbanListRoot = ({ plugin }: KanbanListUIProps) => {
	const { errorMessage, isLoading, isRefreshing, items, reloadList, scheduleReload } =
		useKanbanListData(plugin.app);
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

	const handleOpenBoard = useCallback(
		(path: string) => {
			const target = plugin.app.vault.getAbstractFileByPath(path);
			if (!(target instanceof TFile)) {
				new Notice('Kanban file not found.');
				void scheduleReload();
				return;
			}
			void plugin.kanbanManager.openBoard(target);
		},
		[plugin.app.vault, plugin.kanbanManager, scheduleReload],
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
						<KanbanBoardCard
							dateFormatter={dateFormatter}
							key={item.path}
							item={item}
							onOpenBoard={(nextItem) => {
								handleOpenBoard(nextItem.path);
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export const mountKanbanListUI = (
	containerEl: HTMLElement,
	plugin: KanbanListPluginContext,
): void => {
	render(<KanbanListRoot plugin={plugin} />, containerEl);
};

export const unmountKanbanListUI = (containerEl: HTMLElement): void => {
	render(null, containerEl);
};
