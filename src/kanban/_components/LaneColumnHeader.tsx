import { requestApproval } from '../view/card-menu';
import { CheckIcon, ChevronIcon, DragIcon, RemoveIcon, XIcon } from './icons';
import type { App } from 'obsidian';
import { h } from 'preact';

type LaneColumnHeaderProps = {
	app: App;
	laneId: string;
	laneTitle: string;
	cardCount: number;
	dragHandleRef: { current: HTMLDivElement | null };
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
	isEditingTitle: boolean;
	draftLaneTitle: string;
	setDraftLaneTitle: (value: string) => void;
	onStartEditTitle: () => void;
	onSubmitLaneTitle: () => Promise<void>;
	onCancelLaneTitle: () => void;
	onRemoveLane: (laneId: string) => Promise<void>;
};

export const LaneColumnHeader = ({
	app,
	laneId,
	laneTitle,
	cardCount,
	dragHandleRef,
	isCollapsed,
	onToggleCollapsed,
	isEditingTitle,
	draftLaneTitle,
	setDraftLaneTitle,
	onStartEditTitle,
	onSubmitLaneTitle,
	onCancelLaneTitle,
	onRemoveLane,
}: LaneColumnHeaderProps): h.JSX.Element => {
	return (
		<div className="flex items-center gap-1 px-1.5 pb-1">
			<div
				ref={dragHandleRef}
				role="button"
				tabIndex={0}
				className="inline-flex cursor-grab items-center justify-center rounded-md p-0.5 text-[color:var(--text-normal)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
				title="Drag to reorder"
			>
				<DragIcon className="h-6 w-6" />
			</div>
			<div
				role="button"
				tabIndex={0}
				className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
				aria-label={isCollapsed ? 'Expand list' : 'Collapse list'}
				onClick={onToggleCollapsed}
			>
				<ChevronIcon
					className={
						isCollapsed ? 'h-4 w-4 rotate-180 transition-transform' : 'h-4 w-4 transition-transform'
					}
				/>
			</div>
			{isEditingTitle ? (
				<input
					data-lane-title-input="true"
					className="h-7 w-full rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-primary)] px-2 text-xs font-semibold tracking-wide text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
					value={draftLaneTitle}
					onInput={(event) => setDraftLaneTitle(event.currentTarget.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							void onSubmitLaneTitle();
						} else if (event.key === 'Escape') {
							event.preventDefault();
							onCancelLaneTitle();
						}
					}}
				/>
			) : (
				<div
					className="cursor-text text-xs font-semibold tracking-wide text-[color:var(--text-normal)] select-text"
					onDblClick={onStartEditTitle}
				>
					{laneTitle}
				</div>
			)}
			<div className="ml-auto flex gap-1">
				{!isEditingTitle && (
					<span className="self-center text-xs font-semibold text-[color:var(--text-muted)]">
						{cardCount}
					</span>
				)}
				{isEditingTitle ? (
					<>
						<div
							role="button"
							tabIndex={0}
							className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-[color:var(--text-normal)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
							aria-label="Save title"
							onClick={() => void onSubmitLaneTitle()}
						>
							<CheckIcon className="h-4 w-4" />
						</div>
						<div
							role="button"
							tabIndex={0}
							className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
							aria-label="Cancel"
							onClick={onCancelLaneTitle}
						>
							<XIcon className="h-4 w-4" />
						</div>
					</>
				) : (
					<div
						role="button"
						tabIndex={0}
						className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-[color:var(--text-muted)] hover:bg-[var(--background-modifier-hover)] hover:text-[color:var(--text-normal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text-accent)]"
						onClick={() => {
							void (async () => {
								const ok = await requestApproval(app, `Remove List "${laneTitle}"?`);
								if (!ok) return;
								await onRemoveLane(laneId);
							})();
						}}
					>
						<RemoveIcon className="h-4 w-4" />
					</div>
				)}
			</div>
		</div>
	);
};
