import type { KanbanRootActionHandlers } from '../types';
import type { CrossBoardCardMovePayload } from '../utils/card-dnd';
import { buildCardTitleWithPrimaryLink } from '../utils/card-title';
import type { CardActionContext } from './card-action-service';
import { copyCardLink, createEventFromCard, createNoteFromCard } from './card-action-service';
import { removeCardWithLinkedCleanup } from './card-removal-service';
import {
	addCard,
	addLane,
	findCardBlockId,
	generateBlockId,
	hasCard,
	insertCardAt,
	moveCard,
	removeCard,
	removeLane,
	reorderLanesByOrder,
	updateCardBlockId,
	updateCardTitle,
	updateLaneTitle,
} from './model-service';
import type {
	KanbanViewCardActionsServiceContext,
	KanbanViewCrossBoardServiceContext,
	KanbanViewServiceContext,
} from './view-service-context';
import { Notice } from 'obsidian';

const updateCardTitleWithLink = async (
	context: KanbanViewCardActionsServiceContext,
	cardId: string,
	link: string,
	originalTitle: string,
): Promise<void> => {
	const nextTitle = buildCardTitleWithPrimaryLink(link, originalTitle);
	await context.applyBoardMutation((board) => updateCardTitle(board, cardId, nextTitle));
};

const ensureCardBlockId = async (
	context: KanbanViewCardActionsServiceContext,
	cardId: string,
): Promise<string | null> => {
	const board = context.getBoard();
	if (!board) return null;
	const existing = findCardBlockId(board, cardId);
	if (existing) return existing;
	const nextId = generateBlockId();
	await context.applyBoardMutation((nextBoard) => updateCardBlockId(nextBoard, cardId, nextId));
	return nextId;
};

const createCardActionContext = (
	context: KanbanViewCardActionsServiceContext,
): CardActionContext | null => {
	const file = context.getFile();
	if (!file) return null;
	return {
		app: context.app,
		file,
		board: context.getBoard(),
		calendar: context.calendar,
		getTodayDateKey: context.getTodayDateKey,
		cardEventProperty: context.cardEventProperty,
		eventCardProperty: context.eventCardProperty,
		getCardTitle: context.getCardTitle,
		ensureCardBlockId: (cardId) => ensureCardBlockId(context, cardId),
		updateCardTitleWithLink: (cardId, link, originalTitle) =>
			updateCardTitleWithLink(context, cardId, link, originalTitle),
	};
};

export const handleCreateNoteFromCard = async (
	context: KanbanViewCardActionsServiceContext,
	cardId: string,
): Promise<void> => {
	const actionContext = createCardActionContext(context);
	if (!actionContext) return;
	await createNoteFromCard(actionContext, cardId);
};

export const handleCreateEventFromCard = async (
	context: KanbanViewCardActionsServiceContext,
	cardId: string,
): Promise<void> => {
	const actionContext = createCardActionContext(context);
	if (!actionContext) return;
	await createEventFromCard(actionContext, cardId);
};

export const handleCopyCardLink = async (
	context: KanbanViewCardActionsServiceContext,
	cardId: string,
): Promise<void> => {
	const actionContext = createCardActionContext(context);
	if (!actionContext) return;
	await copyCardLink(actionContext, cardId);
};

export const removeCardForExternalMove = async (
	context: KanbanViewCrossBoardServiceContext,
	cardId: string,
): Promise<boolean> => {
	const board = context.getBoard();
	if (!board) return false;
	if (!hasCard(board, cardId)) return false;
	return context.applyBoardMutation((nextBoard) => removeCard(nextBoard, cardId));
};

export const handleMoveCard = async (
	context: KanbanViewCrossBoardServiceContext,
	cardId: string,
	laneId: string,
	index: number,
): Promise<void> => {
	await context.applyBoardMutation((board) => moveCard(board, cardId, laneId, index));
};

export const handleMoveCardFromOtherBoard = async (
	context: KanbanViewCrossBoardServiceContext,
	payload: CrossBoardCardMovePayload,
	laneId: string,
	index: number,
): Promise<void> => {
	const board = context.getBoard();
	const file = context.getFile();
	if (!board || !file) return;
	if (payload.sourceBoardPath === file.path) {
		await handleMoveCard(context, payload.cardId, laneId, index);
		return;
	}
	if (!board.lanes.some((lane) => lane.id === laneId)) return;
	const normalizedTitle = payload.title.replace(/\r\n/g, '\n').trim();
	if (!normalizedTitle) return;

	await context.applyBoardMutation((nextBoard) =>
		insertCardAt(nextBoard, laneId, index, {
			title: normalizedTitle,
			blockId: payload.blockId,
		}),
	);

	const removed = await context.removeCardFromSourceBoard(payload.sourceBoardPath, payload.cardId);
	if (!removed) {
		new Notice('Card moved, but source card removal failed. Remove it manually if duplicated.');
	}
};

export const buildKanbanRootActionHandlers = (
	context: KanbanViewServiceContext,
	closeAddLaneForm: () => void,
): KanbanRootActionHandlers => ({
	onCloseAddLaneForm: closeAddLaneForm,
	onAddLane: async (title: string) => {
		await context.applyBoardMutation((board) => addLane(board, title));
	},
	onCreateNoteFromCard: (cardId: string) => {
		void handleCreateNoteFromCard(context, cardId);
	},
	onCopyCardLink: (cardId: string) => {
		void handleCopyCardLink(context, cardId);
	},
	onCreateEventFromCard: (cardId: string) => {
		void handleCreateEventFromCard(context, cardId);
	},
	onRemoveLane: async (laneId: string) => {
		await context.applyBoardMutation((board) => removeLane(board, laneId));
	},
	onReorderLanes: async (order: string[]) => {
		await context.applyBoardMutation((board) => reorderLanesByOrder(board, order));
	},
	onAddCard: async (laneId: string, title: string) => {
		await context.applyBoardMutation((board) => addCard(board, laneId, title));
	},
	onUpdateLaneTitle: async (laneId: string, title: string) => {
		await context.applyBoardMutation((board) => updateLaneTitle(board, laneId, title));
	},
	onRemoveCard: async (cardId: string, options) => {
		await removeCardWithLinkedCleanup({
			app: context.app,
			board: context.getBoard(),
			sourceFile: context.getFile(),
			cardId,
			options,
			calendar: context.calendar,
			applyBoardMutation: context.applyBoardMutation,
			cardEventProperty: context.cardEventProperty,
			notice: (message: string) => {
				new Notice(message);
			},
		});
	},
	onUpdateCardTitle: async (cardId: string, title: string) => {
		await context.applyBoardMutation((board) => updateCardTitle(board, cardId, title));
	},
	onMoveCard: async (cardId: string, laneId: string, index: number) => {
		await handleMoveCard(context, cardId, laneId, index);
	},
	onMoveCardFromOtherBoard: async (
		payload: CrossBoardCardMovePayload,
		laneId: string,
		index: number,
	) => {
		await handleMoveCardFromOtherBoard(context, payload, laneId, index);
	},
});
