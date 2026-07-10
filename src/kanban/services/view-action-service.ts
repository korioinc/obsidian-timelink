import { createNotice } from '../../shared/services/notice-service';
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
	BoardMutation,
	KanbanViewCardActionsServiceContext,
	KanbanViewCrossBoardServiceContext,
	KanbanViewServiceContext,
} from './view-service-context';

const notice = createNotice();

const applyConfirmedBoardMutation = async (
	context: Pick<KanbanViewServiceContext, 'applyBoardMutation'>,
	mutate: BoardMutation,
): Promise<true> => {
	const updated = await context.applyBoardMutation(mutate);
	if (!updated) {
		throw new Error('Board mutation was not applied.');
	}
	return true;
};

const runReportedAction = async (
	label: string,
	failureMessage: string,
	action: () => Promise<unknown>,
	options: { rethrow?: boolean } = {},
): Promise<void> => {
	try {
		await action();
	} catch (error) {
		console.error(label, error);
		notice(failureMessage);
		if (options.rethrow) throw error;
	}
};

const updateCardTitleWithLink = async (
	context: KanbanViewCardActionsServiceContext,
	cardId: string,
	link: string,
	originalTitle: string,
): Promise<void> => {
	const nextTitle = buildCardTitleWithPrimaryLink(link, originalTitle);
	await applyConfirmedBoardMutation(context, (board) => updateCardTitle(board, cardId, nextTitle));
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
	await applyConfirmedBoardMutation(context, (nextBoard) =>
		updateCardBlockId(nextBoard, cardId, nextId),
	);
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
		notice: (message) => {
			notice(message);
		},
		updateCardTitleWithLink: (cardId, link, originalTitle) =>
			updateCardTitleWithLink(context, cardId, link, originalTitle),
	};
};

const handleCreateNoteFromCard = async (
	context: KanbanViewCardActionsServiceContext,
	cardId: string,
): Promise<void> => {
	const actionContext = createCardActionContext(context);
	if (!actionContext) return;
	await createNoteFromCard(actionContext, cardId);
};

const handleCreateEventFromCard = async (
	context: KanbanViewCardActionsServiceContext,
	cardId: string,
): Promise<void> => {
	const actionContext = createCardActionContext(context);
	if (!actionContext) return;
	await createEventFromCard(actionContext, cardId);
};

const handleCopyCardLink = async (
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

const handleMoveCard = async (
	context: KanbanViewCrossBoardServiceContext,
	cardId: string,
	laneId: string,
	index: number,
): Promise<void> => {
	await applyConfirmedBoardMutation(context, (board) => moveCard(board, cardId, laneId, index));
};

const handleMoveCardFromOtherBoard = async (
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

	await applyConfirmedBoardMutation(context, (nextBoard) =>
		insertCardAt(nextBoard, laneId, index, {
			title: normalizedTitle,
			blockId: payload.blockId,
		}),
	);

	let removed: boolean;
	try {
		removed = await context.removeCardFromSourceBoard(payload.sourceBoardPath, payload.cardId);
	} catch (error) {
		console.error('Failed to remove source card after cross-board move', error);
		notice('Card moved, but source card removal failed. Remove it manually if duplicated.');
		return;
	}
	if (!removed) {
		console.error('Failed to remove source card after cross-board move');
		notice('Card moved, but source card removal failed. Remove it manually if duplicated.');
	}
};

export const buildKanbanRootActionHandlers = (
	context: KanbanViewServiceContext,
	closeAddLaneForm: () => void,
): KanbanRootActionHandlers => ({
	onCloseAddLaneForm: closeAddLaneForm,
	onAddLane: (title: string) =>
		runReportedAction(
			'Failed to add kanban list',
			'Failed to add list.',
			() => applyConfirmedBoardMutation(context, (board) => addLane(board, title)),
			{ rethrow: true },
		),
	onCreateNoteFromCard: (cardId: string) => {
		void runReportedAction(
			'Failed to create note from card',
			'Failed to create note from card.',
			() => handleCreateNoteFromCard(context, cardId),
		);
	},
	onCopyCardLink: (cardId: string) => {
		void runReportedAction('Failed to copy card link', 'Failed to copy card link.', async () => {
			await handleCopyCardLink(context, cardId);
			notice('Card link copied to clipboard.');
		});
	},
	onCreateEventFromCard: (cardId: string) => {
		void runReportedAction(
			'Failed to create event from card',
			'Failed to create event from card.',
			() => handleCreateEventFromCard(context, cardId),
		);
	},
	onRemoveLane: (laneId: string) =>
		runReportedAction('Failed to remove kanban list', 'Failed to remove list.', () =>
			applyConfirmedBoardMutation(context, (board) => removeLane(board, laneId)),
		),
	onReorderLanes: (order: string[]) =>
		runReportedAction('Failed to reorder kanban lists', 'Failed to reorder lists.', () =>
			applyConfirmedBoardMutation(context, (board) => reorderLanesByOrder(board, order)),
		),
	onAddCard: (laneId: string, title: string) =>
		runReportedAction(
			'Failed to add kanban card',
			'Failed to add card.',
			() => applyConfirmedBoardMutation(context, (board) => addCard(board, laneId, title)),
			{ rethrow: true },
		),
	onUpdateLaneTitle: (laneId: string, title: string) =>
		runReportedAction(
			'Failed to update kanban list',
			'Failed to update list.',
			() => applyConfirmedBoardMutation(context, (board) => updateLaneTitle(board, laneId, title)),
			{ rethrow: true },
		),
	onRemoveCard: (cardId: string, options) =>
		runReportedAction('Failed to remove kanban card', 'Failed to remove card.', () =>
			removeCardWithLinkedCleanup({
				app: context.app,
				board: context.getBoard(),
				sourceFile: context.getFile(),
				cardId,
				options,
				calendar: context.calendar,
				applyBoardMutation: (mutate) => applyConfirmedBoardMutation(context, mutate),
				cardEventProperty: context.cardEventProperty,
				notice: (message: string) => {
					notice(message);
				},
			}),
		),
	onUpdateCardTitle: (cardId: string, title: string) =>
		runReportedAction(
			'Failed to update kanban card',
			'Failed to update card.',
			() => applyConfirmedBoardMutation(context, (board) => updateCardTitle(board, cardId, title)),
			{ rethrow: true },
		),
	onMoveCard: (cardId: string, laneId: string, index: number) =>
		runReportedAction('Failed to move kanban card', 'Failed to move card.', () =>
			handleMoveCard(context, cardId, laneId, index),
		),
	onMoveCardFromOtherBoard: (payload: CrossBoardCardMovePayload, laneId: string, index: number) =>
		runReportedAction('Failed to move kanban card', 'Failed to move card.', () =>
			handleMoveCardFromOtherBoard(context, payload, laneId, index),
		),
});
