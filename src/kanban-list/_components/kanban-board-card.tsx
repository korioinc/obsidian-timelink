import type { KanbanListItem } from '../types';

type KanbanBoardCardProps = {
	dateFormatter: Intl.DateTimeFormat;
	item: KanbanListItem;
	onOpenBoard: (item: KanbanListItem) => void;
};

export const KanbanBoardCard = ({ dateFormatter, item, onOpenBoard }: KanbanBoardCardProps) => {
	return (
		<div
			role="button"
			tabIndex={0}
			className="flex w-full cursor-pointer flex-col items-start gap-1 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-3 text-left transition hover:border-[var(--interactive-accent)] hover:bg-[var(--background-secondary-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
			onDblClick={() => {
				onOpenBoard(item);
			}}
			onKeyDown={(event) => {
				if (event.key !== 'Enter') return;
				event.preventDefault();
				onOpenBoard(item);
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
	);
};
