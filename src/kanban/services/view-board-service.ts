import { normalizeHexColor } from '../../shared/color/normalize-hex-color';
import { KANBAN_BOARD_COLOR_KEY } from '../../shared/frontmatter/kanban-frontmatter';
import type { KanbanBoardSettings } from '../types';
import { collectLinkedEventFiles } from './card-service';
import { updateFrontmatterColor } from './color-service';
import { normalizeBoardSettings } from './settings-service';
import type { BoardMutation, KanbanViewBoardServiceContext } from './view-service-context';
import { Notice } from 'obsidian';

export const applyBoardMutation = async (
	context: KanbanViewBoardServiceContext,
	mutate: BoardMutation,
): Promise<boolean> => {
	const board = context.getBoard();
	if (!board) return false;
	context.setBoard(mutate(board));
	await context.persist();
	context.render();
	return true;
};

export const updateBoardSettings = async (
	context: KanbanViewBoardServiceContext,
	partial: KanbanBoardSettings,
): Promise<void> => {
	const board = context.getBoard();
	if (!board) return;
	const next = { ...board.settings, ...partial };
	Object.keys(next).forEach((key) => {
		const typedKey = key as keyof KanbanBoardSettings;
		if (next[typedKey] === undefined) {
			delete next[typedKey];
		}
	});
	context.setBoard({ ...board, settings: normalizeBoardSettings(next) });
	await context.persist();
	context.syncHeaderButtons();
	context.render();
};

const bulkUpdateLinkedEventColors = async (
	context: KanbanViewBoardServiceContext,
	color: string | undefined,
): Promise<void> => {
	const board = context.getBoard();
	const file = context.getFile();
	if (!board || !file) return;
	const eventFiles = collectLinkedEventFiles(
		context.app,
		board,
		file.path,
		context.cardEventProperty,
	);

	const normalized = normalizeHexColor(color) ?? undefined;
	for (const eventFile of eventFiles) {
		await updateFrontmatterColor(context.app, eventFile, 'color', normalized);
	}
	if (eventFiles.size > 0) {
		new Notice(`Updated ${eventFiles.size} linked event${eventFiles.size === 1 ? '' : 's'}.`);
	}
};

export const applyBoardColorChange = async (
	context: KanbanViewBoardServiceContext,
	color: string | undefined,
): Promise<void> => {
	const file = context.getFile();
	if (!file) {
		new Notice('Kanban board file not found.');
		return;
	}
	const normalized = normalizeHexColor(color) ?? undefined;
	try {
		await updateFrontmatterColor(context.app, file, context.boardColorProperty, normalized);
	} catch (error) {
		console.error('Failed to update board color', error);
		new Notice('Failed to update board color.');
		return;
	}

	const board = context.getBoard();
	if (board) {
		context.setBoard({
			...board,
			settings: normalizeBoardSettings({
				...board.settings,
				[KANBAN_BOARD_COLOR_KEY]: normalized,
			}),
		});
	}
	context.syncHeaderButtons();
	context.render();
	await bulkUpdateLinkedEventColors(context, normalized);
};
