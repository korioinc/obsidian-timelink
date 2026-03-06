import { useLaneCardDnd } from '../hooks/use-lane-card-dnd';
import { useLaneCardEditorState } from '../hooks/use-lane-card-editor-state';
import { useLaneDnd, useObsidianLinkDrop } from '../hooks/use-lane-dnd';
import type { KanbanBoard, KanbanRootActionHandlers } from '../types';
import { showCardMenu } from '../view/card-menu';
import type { CardTitleMarkdownContext } from './CardTitleRenderer';
import { LaneColumnCards } from './LaneColumnCards';
import { LaneColumnHeader } from './LaneColumnHeader';
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

type LaneColumnActionHandlers = Pick<
	KanbanRootActionHandlers,
	| 'onCreateNoteFromCard'
	| 'onCopyCardLink'
	| 'onCreateEventFromCard'
	| 'onRemoveLane'
	| 'onReorderLanes'
	| 'onUpdateLaneTitle'
	| 'onAddCard'
	| 'onRemoveCard'
	| 'onUpdateCardTitle'
	| 'onMoveCard'
	| 'onMoveCardFromOtherBoard'
>;

type LaneColumnProps = LaneColumnActionHandlers & {
	markdownContext: CardTitleMarkdownContext;
	lane: KanbanBoard['lanes'][number];
	wrapperRef: { current: HTMLDivElement | null };
	cardHasEventById: Map<string, boolean>;
	layout?: 'board' | 'list';
	isCardDragging: boolean;
	onCardDragStart: () => void;
	onCardDragEnd: () => void;
};

export function LaneColumn({
	markdownContext,
	lane,
	wrapperRef,
	cardHasEventById,
	layout = 'board',
	onCreateNoteFromCard,
	onCopyCardLink,
	onCreateEventFromCard,
	onRemoveLane,
	onReorderLanes,
	onUpdateLaneTitle,
	onAddCard,
	onRemoveCard,
	onUpdateCardTitle,
	onMoveCard,
	onMoveCardFromOtherBoard,
	isCardDragging,
	onCardDragStart,
	onCardDragEnd,
}: LaneColumnProps): h.JSX.Element {
	const laneRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const dragHandleRef = useRef<HTMLDivElement>(null);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const isListView = layout === 'list';
	const {
		cardTitleRef,
		isAdding,
		setIsAdding,
		draftTitle,
		setDraftTitle,
		isEditingTitle,
		setIsEditingTitle,
		draftLaneTitle,
		setDraftLaneTitle,
		editingCardId,
		draftCardTitle,
		setDraftCardTitle,
		isInteractionLocked,
		submitLaneTitle,
		cancelLaneTitle,
		submitCard,
		cancelCard,
		startEditCard,
		submitCardEdit,
		cancelCardEdit,
	} = useLaneCardEditorState({
		laneId: lane.id,
		laneTitle: lane.title,
		onUpdateLaneTitle,
		onAddCard,
		onUpdateCardTitle,
	});

	useEffect(() => {
		if (!isEditingTitle) return;
		const input = laneRef.current?.querySelector<HTMLInputElement>(
			'[data-lane-title-input="true"]',
		);
		if (!input) return;
		window.setTimeout(() => input.focus(), 0);
	}, [isEditingTitle]);

	useLaneDnd({
		wrapperRef,
		laneRef,
		dragHandleRef,
		laneId: lane.id,
		isInteractionLocked,
		isListView,
		onReorderLanes,
	});

	useObsidianLinkDrop({
		app: markdownContext.app,
		sourcePath: markdownContext.sourcePath,
		laneId: lane.id,
		laneRef,
		listRef,
		isInteractionLocked,
		onAddCard,
	});

	const openCardOptions = (event: MouseEvent, cardId: string, title: string) => {
		cardTitleRef.current.set(cardId, title);
		showCardMenu({
			app: markdownContext.app,
			event,
			sourcePath: markdownContext.sourcePath,
			cardId,
			title,
			onStartEdit: startEditCard,
			onCreateNoteFromCard,
			onCopyCardLink,
			onCreateEventFromCard,
			onRemoveCard,
		});
	};

	const { handleCardDragOver, handleCardDrop, handleCardDragStart, handleCardDragEnd } =
		useLaneCardDnd({
			laneId: lane.id,
			sourcePath: markdownContext.sourcePath,
			listRef,
			wrapperRef,
			isInteractionLocked,
			onMoveCard,
			onMoveCardFromOtherBoard,
			onCardDragStart,
			onCardDragEnd,
		});

	return (
		<div
			ref={laneRef}
			className={
				isListView
					? 'w-full max-w-none min-w-0 rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] py-2'
					: 'w-[260px] max-w-[320px] min-w-[260px] flex-none rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)] py-2'
			}
			data-lane-id={lane.id}
		>
			<LaneColumnHeader
				app={markdownContext.app}
				laneId={lane.id}
				laneTitle={lane.title}
				cardCount={lane.cards.length}
				dragHandleRef={dragHandleRef}
				isCollapsed={isCollapsed}
				onToggleCollapsed={() => setIsCollapsed((previous) => !previous)}
				isEditingTitle={isEditingTitle}
				draftLaneTitle={draftLaneTitle}
				setDraftLaneTitle={setDraftLaneTitle}
				onStartEditTitle={() => setIsEditingTitle(true)}
				onSubmitLaneTitle={submitLaneTitle}
				onCancelLaneTitle={cancelLaneTitle}
				onRemoveLane={onRemoveLane}
			/>
			<div className="my-1 border-b border-[var(--background-modifier-border)]" />
			{!isCollapsed ? (
				<LaneColumnCards
					markdownContext={markdownContext}
					lane={lane}
					layout={layout}
					cardHasEventById={cardHasEventById}
					listRef={listRef}
					isCardDragging={isCardDragging}
					isInteractionLocked={isInteractionLocked}
					editingCardId={editingCardId}
					draftCardTitle={draftCardTitle}
					setDraftCardTitle={setDraftCardTitle}
					submitCardEdit={submitCardEdit}
					cancelCardEdit={cancelCardEdit}
					startEditCard={startEditCard}
					cardTitleRef={cardTitleRef}
					openCardOptions={openCardOptions}
					handleCardDragOver={handleCardDragOver}
					handleCardDrop={handleCardDrop}
					handleCardDragStart={handleCardDragStart}
					handleCardDragEnd={handleCardDragEnd}
					isAdding={isAdding}
					setIsAdding={setIsAdding}
					draftTitle={draftTitle}
					setDraftTitle={setDraftTitle}
					submitCard={submitCard}
					cancelCard={cancelCard}
				/>
			) : null}
		</div>
	);
}
