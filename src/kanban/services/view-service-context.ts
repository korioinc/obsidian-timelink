import type { KanbanBoard } from '../types';
import type { CardActionContext } from './card-action-service';
import type { App, TFile } from 'obsidian';

export type BoardMutation = (board: KanbanBoard) => KanbanBoard;

export type KanbanViewServiceContext = {
	app: App;
	getFile: () => TFile | null;
	getBoard: () => KanbanBoard | null;
	setBoard: (board: KanbanBoard | null) => void;
	persist: () => Promise<void>;
	render: () => void;
	syncHeaderButtons: () => void;
	getCardTitle: (cardId: string) => string | null;
	calendar: CardActionContext['calendar'];
	getTodayDateKey: () => string;
	applyBoardMutation: (mutate: BoardMutation) => Promise<boolean>;
	removeCardFromSourceBoard: (sourceBoardPath: string, cardId: string) => Promise<boolean>;
	boardColorProperty: string;
	cardEventProperty: string;
	eventCardProperty: string;
};

export type KanbanViewBoardServiceContext = Pick<
	KanbanViewServiceContext,
	| 'app'
	| 'getFile'
	| 'getBoard'
	| 'setBoard'
	| 'persist'
	| 'render'
	| 'syncHeaderButtons'
	| 'boardColorProperty'
	| 'cardEventProperty'
>;

export type KanbanViewCardActionsServiceContext = Pick<
	KanbanViewServiceContext,
	| 'app'
	| 'getBoard'
	| 'getFile'
	| 'getCardTitle'
	| 'calendar'
	| 'getTodayDateKey'
	| 'cardEventProperty'
	| 'eventCardProperty'
	| 'applyBoardMutation'
>;

export type KanbanViewCrossBoardServiceContext = Pick<
	KanbanViewServiceContext,
	'getBoard' | 'getFile' | 'applyBoardMutation' | 'removeCardFromSourceBoard'
>;
