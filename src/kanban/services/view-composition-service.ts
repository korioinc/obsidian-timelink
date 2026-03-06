import { KANBAN_BOARD_COLOR_KEY } from '../../shared/frontmatter/kanban-frontmatter';
import type { KanbanBoard } from '../types';
import { resolveBoardColor } from './color-service';
import { isKanbanBoard, parseKanbanBoard } from './parser-service';
import { normalizeBoardSettings } from './settings-service';
import type { App, TFile } from 'obsidian';

export type KanbanViewMode = 'board' | 'table' | 'list';
const KANBAN_VIEW_MODES: readonly KanbanViewMode[] = ['board', 'table', 'list'] as const;

type ParseBoardStateParams = {
	app: App;
	file: TFile | null | undefined;
	data: string;
	boardColorProperty: string;
};

export const parseBoardStateFromViewData = ({
	app,
	file,
	data,
	boardColorProperty,
}: ParseBoardStateParams): KanbanBoard | null => {
	if (!isKanbanBoard(data)) return null;
	const parsedBoard = parseKanbanBoard(data);
	const boardColor = resolveBoardColor(app, file, data, boardColorProperty);
	return {
		...parsedBoard,
		settings: normalizeBoardSettings({
			...parsedBoard.settings,
			[KANBAN_BOARD_COLOR_KEY]: boardColor,
		}),
	};
};

const isKanbanViewMode = (value: unknown): value is KanbanViewMode =>
	typeof value === 'string' && KANBAN_VIEW_MODES.includes(value as KanbanViewMode);

export const resolveKanbanViewMode = (value: unknown, fallback: KanbanViewMode): KanbanViewMode => {
	return isKanbanViewMode(value) ? value : fallback;
};

export const buildKanbanViewState = (
	baseState: Record<string, unknown>,
	filePath: string | undefined,
	viewMode: KanbanViewMode,
): Record<string, unknown> => {
	if (filePath) {
		return { ...baseState, file: filePath, viewMode };
	}
	return { ...baseState, viewMode };
};
