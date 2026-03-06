import type { KanbanBoard } from '../types';
import {
	clearActiveCardDrag,
	getActiveCardDrag,
	getDropIndexFromPointer,
	markActiveCardDragHandled,
	moveDraggedCardByPointer,
	parseCardDragPayload,
	readCardOrderForList,
	restoreOrder,
	setActiveCardDrag,
	type CrossBoardCardMovePayload,
	writeCardDragPayload,
} from '../utils/card-dnd';
import type { TargetedDragEvent } from 'preact';
import { useRef } from 'preact/hooks';

type LaneCard = KanbanBoard['lanes'][number]['cards'][number];

type UseLaneCardDndParams = {
	laneId: string;
	sourcePath: string;
	listRef: { current: HTMLUListElement | null };
	wrapperRef: { current: HTMLDivElement | null };
	isInteractionLocked: boolean;
	onMoveCard: (cardId: string, laneId: string, index: number) => Promise<void>;
	onMoveCardFromOtherBoard: (
		payload: CrossBoardCardMovePayload,
		laneId: string,
		index: number,
	) => Promise<void>;
	onCardDragStart: () => void;
	onCardDragEnd: () => void;
};

export function useLaneCardDnd({
	laneId,
	sourcePath,
	listRef,
	wrapperRef,
	isInteractionLocked,
	onMoveCard,
	onMoveCardFromOtherBoard,
	onCardDragStart,
	onCardDragEnd,
}: UseLaneCardDndParams) {
	const cardOrderRef = useRef<{
		listEl: HTMLUListElement;
		order: string[];
		lookupRoot: ParentNode;
	} | null>(null);

	const handleCardDragOver = (event: TargetedDragEvent<HTMLUListElement>) => {
		if (isInteractionLocked) return;
		const payload = parseCardDragPayload(event.dataTransfer);
		if (!payload) return;
		event.preventDefault();
		event.stopPropagation();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
		const listEl = listRef.current;
		if (!listEl) return;
		const isSameBoard = payload.sourceBoardPath === sourcePath;
		if (!isSameBoard) {
			return;
		}
		const scope = wrapperRef.current ?? listEl;
		const draggedEl = Array.from(scope.querySelectorAll<HTMLLIElement>('li[data-card-id]')).find(
			(element) =>
				element.dataset.cardId === payload.cardId && element.dataset.laneId === payload.fromLaneId,
		);
		if (!draggedEl) return;
		if (draggedEl.parentElement !== listEl) {
			listEl.appendChild(draggedEl);
		}
		moveDraggedCardByPointer(listEl, draggedEl, event.clientY);
	};

	const handleCardDrop = (event: TargetedDragEvent<HTMLUListElement>) => {
		if (isInteractionLocked) return;
		const payload = parseCardDragPayload(event.dataTransfer);
		if (!payload) return;
		event.preventDefault();
		event.stopPropagation();
		const listEl = listRef.current;
		if (!listEl) return;
		const isSameBoard = payload.sourceBoardPath === sourcePath;
		const index = isSameBoard
			? (() => {
					const order = readCardOrderForList(listEl);
					return order.indexOf(payload.cardId);
				})()
			: getDropIndexFromPointer(listEl, event.clientY);
		if (index < 0) return;
		markActiveCardDragHandled(payload);
		if (isSameBoard) {
			if (payload.fromLaneId === laneId && payload.fromIndex === index) return;
			void onMoveCard(payload.cardId, laneId, index);
			return;
		}
		void onMoveCardFromOtherBoard(payload, laneId, index);
	};

	const handleCardDragStart = (
		event: TargetedDragEvent<HTMLLIElement>,
		card: LaneCard,
		index: number,
	) => {
		if (isInteractionLocked) {
			event.preventDefault();
			return;
		}
		onCardDragStart();
		const listEl = listRef.current;
		if (listEl) {
			cardOrderRef.current = {
				listEl,
				order: readCardOrderForList(listEl),
				lookupRoot: wrapperRef.current ?? listEl,
			};
		}
		const payload: CrossBoardCardMovePayload = {
			sourceBoardPath: sourcePath,
			cardId: card.id,
			fromLaneId: laneId,
			fromIndex: index,
			title: card.title,
			blockId: card.blockId,
		};
		setActiveCardDrag(payload);
		event.currentTarget.classList.add('opacity-40');
		if (event.dataTransfer) {
			writeCardDragPayload(event.dataTransfer, payload);
		}
	};

	const handleCardDragEnd = (event: TargetedDragEvent<HTMLLIElement>, cardId: string) => {
		onCardDragEnd();
		event.currentTarget.classList.remove('opacity-40');
		const activeDrag = getActiveCardDrag();
		if (
			activeDrag &&
			activeDrag.sourceBoardPath === sourcePath &&
			activeDrag.cardId === cardId &&
			activeDrag.fromLaneId === laneId
		) {
			if (!activeDrag.handled && cardOrderRef.current) {
				restoreOrder(
					cardOrderRef.current.listEl,
					cardOrderRef.current.order,
					'data-card-id',
					cardOrderRef.current.lookupRoot,
				);
			}
			clearActiveCardDrag();
		}
		cardOrderRef.current = null;
	};

	return {
		handleCardDragOver,
		handleCardDrop,
		handleCardDragStart,
		handleCardDragEnd,
	};
}
