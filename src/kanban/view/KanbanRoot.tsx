import { LaneColumn } from '../_components/LaneColumn';
import { AddLaneForm } from '../_components/LaneForm';
import type { KanbanBoard, KanbanRootActionHandlers } from '../types';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import type { App, Component } from 'obsidian';
import { Fragment, h } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';

export type KanbanRootProps = KanbanRootActionHandlers & {
	markdownContext: {
		app: App;
		component: Component;
		sourcePath: string;
	};
	board: KanbanBoard | null;
	viewMode: 'board' | 'table' | 'list';
	showAddLaneForm: boolean;
	addLaneAnchorRect: DOMRect | null;
	addLaneAnchorEl: HTMLElement | null | undefined;
	cardHasEventById: Map<string, boolean>;
};

export function KanbanRoot({
	markdownContext,
	board,
	viewMode,
	showAddLaneForm,
	addLaneAnchorRect,
	addLaneAnchorEl,
	cardHasEventById,
	onCloseAddLaneForm,
	onAddLane,
	onCreateNoteFromCard,
	onCopyCardLink,
	onCreateEventFromCard,
	onRemoveLane,
	onReorderLanes,
	onAddCard,
	onUpdateLaneTitle,
	onRemoveCard,
	onUpdateCardTitle,
	onMoveCard,
	onMoveCardFromOtherBoard,
}: KanbanRootProps): h.JSX.Element {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [anchorRect, setAnchorRect] = useState<DOMRect | null>(addLaneAnchorRect ?? null);
	const [isCardDragging, setIsCardDragging] = useState(false);

	useEffect(() => {
		if (!showAddLaneForm) return;
		const rect = addLaneAnchorEl?.getBoundingClientRect();
		setAnchorRect(rect ?? addLaneAnchorRect ?? null);
	}, [showAddLaneForm, addLaneAnchorEl, addLaneAnchorRect]);

	useEffect(() => {
		preventUnhandled.start();
		return () => preventUnhandled.stop();
	}, []);

	if (!board) {
		return (
			<Fragment>
				<div className="p-4 text-sm">No board data available</div>
			</Fragment>
		);
	}

	const portalTarget = typeof document === 'undefined' ? null : document.body;
	const totalCards = board.lanes.reduce((count, lane) => count + lane.cards.length, 0);
	const handleCardDragStart = () => setIsCardDragging(true);
	const handleCardDragEnd = () => setIsCardDragging(false);
	const renderLaneColumns = (layout: 'board' | 'list'): h.JSX.Element => (
		<div
			ref={wrapperRef}
			className={
				layout === 'board'
					? 'flex min-h-0 flex-1 flex-nowrap items-start gap-3 overflow-x-auto pb-3'
					: 'flex flex-col gap-3'
			}
		>
			{board.lanes.map((lane) => (
				<LaneColumn
					key={lane.id}
					markdownContext={markdownContext}
					lane={lane}
					wrapperRef={wrapperRef}
					layout={layout}
					onCreateNoteFromCard={onCreateNoteFromCard}
					onCopyCardLink={onCopyCardLink}
					onCreateEventFromCard={onCreateEventFromCard}
					onRemoveLane={onRemoveLane}
					onReorderLanes={onReorderLanes}
					onUpdateLaneTitle={onUpdateLaneTitle}
					onAddCard={onAddCard}
					onRemoveCard={onRemoveCard}
					onUpdateCardTitle={onUpdateCardTitle}
					onMoveCard={onMoveCard}
					onMoveCardFromOtherBoard={onMoveCardFromOtherBoard}
					cardHasEventById={cardHasEventById}
					isCardDragging={isCardDragging}
					onCardDragStart={handleCardDragStart}
					onCardDragEnd={handleCardDragEnd}
				/>
			))}
		</div>
	);

	return (
		<div
			className="flex h-full flex-col px-4 py-3"
			onDragEndCapture={handleCardDragEnd}
			onDropCapture={handleCardDragEnd}
		>
			{showAddLaneForm &&
				portalTarget &&
				createPortal(
					<div
						className="fixed z-[1000]"
						style={
							anchorRect
								? {
										top: `${anchorRect.bottom + 8}px`,
										right: '24px',
									}
								: { top: '16px', right: '24px' }
						}
					>
						<AddLaneForm onSubmit={onAddLane} onCancel={onCloseAddLaneForm} />
					</div>,
					portalTarget,
				)}
			{viewMode === 'board' && renderLaneColumns('board')}
			{viewMode === 'table' && (
				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="text-left">
								<th className="border-b border-[var(--background-modifier-border)] px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)]">
									Lane
								</th>
								<th className="border-b border-[var(--background-modifier-border)] px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)]">
									Card
								</th>
								<th className="border-b border-[var(--background-modifier-border)] px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)]">
									Index
								</th>
							</tr>
						</thead>
						<tbody>
							{board.lanes.flatMap((lane) =>
								lane.cards.map((card, index) => (
									<tr key={card.id} className="border-b border-[var(--background-modifier-border)]">
										<td className="px-3 py-2 align-top text-xs font-semibold text-[color:var(--text-normal)]">
											{lane.title}
										</td>
										<td className="px-3 py-2 align-top text-xs text-[color:var(--text-normal)]">
											{card.title}
										</td>
										<td className="px-3 py-2 align-top text-xs text-[color:var(--text-muted)]">
											{index + 1}
										</td>
									</tr>
								)),
							)}
							{totalCards === 0 && (
								<tr>
									<td className="px-3 py-3 text-xs text-[color:var(--text-muted)]" colSpan={3}>
										No cards yet
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			)}
			{viewMode === 'list' && renderLaneColumns('list')}
		</div>
	);
}
