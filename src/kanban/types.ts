import { KANBAN_BOARD_COLOR_KEY } from '../shared/frontmatter/kanban-frontmatter';
import type { BOARD_VISIBILITY_SETTINGS } from './constants';
import type { CrossBoardCardMovePayload } from './utils/card-dnd';

export type BoardVisibilitySetting = (typeof BOARD_VISIBILITY_SETTINGS)[number];
export type BoardVisibilitySettingKey = BoardVisibilitySetting['key'];

export interface KanbanBoardSettings extends Partial<Record<BoardVisibilitySettingKey, boolean>> {
	[KANBAN_BOARD_COLOR_KEY]?: string;
}

export interface KanbanCard {
	id: string;
	title: string;
	lineStart: number;
	blockId?: string;
}

export interface KanbanLane {
	id: string;
	title: string;
	lineStart: number;
	lineEnd: number;
	cards: KanbanCard[];
}

export interface KanbanBoard {
	lanes: KanbanLane[];
	settings: KanbanBoardSettings;
}

export type RemoveCardOptions = {
	deleteLinkedNote?: boolean;
};

export type KanbanRootActionHandlers = {
	onCloseAddLaneForm: () => void;
	onAddLane: (title: string) => Promise<void>;
	onCreateNoteFromCard: (cardId: string) => void;
	onCopyCardLink: (cardId: string) => void;
	onCreateEventFromCard: (cardId: string) => void;
	onRemoveLane: (laneId: string) => Promise<void>;
	onReorderLanes: (order: string[]) => Promise<void>;
	onAddCard: (laneId: string, title: string) => Promise<void>;
	onUpdateLaneTitle: (laneId: string, title: string) => Promise<void>;
	onRemoveCard: (cardId: string, options?: RemoveCardOptions) => Promise<void>;
	onUpdateCardTitle: (cardId: string, title: string) => Promise<void>;
	onMoveCard: (cardId: string, laneId: string, index: number) => Promise<void>;
	onMoveCardFromOtherBoard: (
		payload: CrossBoardCardMovePayload,
		laneId: string,
		index: number,
	) => Promise<void>;
};

export type KanbanBoardSettingsView = {
	board: KanbanBoard | null;
	getBoardSettings: () => KanbanBoardSettings;
	updateBoardSettings: (partial: KanbanBoardSettings) => Promise<void>;
	applyBoardColorChange: (color: string | undefined) => Promise<void>;
};
