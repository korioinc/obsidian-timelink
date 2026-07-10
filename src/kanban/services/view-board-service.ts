import { normalizeHexColor } from '../../shared/color/normalize-hex-color';
import { KANBAN_BOARD_COLOR_KEY } from '../../shared/frontmatter/kanban-frontmatter';
import { createNotice } from '../../shared/services/notice-service';
import { mapWithConcurrency } from '../../shared/utils/map-with-concurrency';
import type { KanbanBoardSettings } from '../types';
import { persistBoardMutation } from './board-mutation-service';
import { collectLinkedEventFiles } from './card-service';
import { updateFrontmatterColor } from './color-service';
import { normalizeBoardSettings } from './settings-service';
import type { BoardMutation, KanbanViewBoardServiceContext } from './view-service-context';

const notice = createNotice();
const LINKED_EVENT_COLOR_UPDATE_CONCURRENCY = 8;

export const applyBoardMutation = async (
	context: KanbanViewBoardServiceContext,
	mutate: BoardMutation,
): Promise<boolean> => {
	if (!context.getFile()) return false;
	let updated: boolean;
	try {
		updated = await persistBoardMutation(context, mutate);
	} catch (error) {
		context.render();
		throw error;
	}
	if (!updated) return false;
	context.render();
	return true;
};

export const updateBoardSettings = async (
	context: KanbanViewBoardServiceContext,
	partial: KanbanBoardSettings,
): Promise<void> => {
	if (!context.getFile()) {
		throw new Error('Cannot update kanban board settings without a file.');
	}
	const updated = await persistBoardMutation(context, (board) => {
		const next = { ...board.settings, ...partial };
		Object.keys(next).forEach((key) => {
			const typedKey = key as keyof KanbanBoardSettings;
			if (next[typedKey] === undefined) {
				delete next[typedKey];
			}
		});
		return { ...board, settings: normalizeBoardSettings(next) };
	});
	if (!updated) return;
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
	const results = await mapWithConcurrency(
		Array.from(eventFiles),
		LINKED_EVENT_COLOR_UPDATE_CONCURRENCY,
		async (eventFile) => {
			try {
				await updateFrontmatterColor(context.app, eventFile, 'color', normalized);
				return true;
			} catch (error) {
				console.error(`Failed to update linked event color: ${eventFile.path}`, error);
				return false;
			}
		},
	);
	const updatedCount = results.filter(Boolean).length;
	const failedCount = results.length - updatedCount;
	if (updatedCount > 0) {
		notice(`Updated ${updatedCount} linked event${updatedCount === 1 ? '' : 's'}.`);
	}
	if (failedCount > 0) {
		notice(`Failed to update ${failedCount} linked event${failedCount === 1 ? '' : 's'}.`);
	}
};

export const applyBoardColorChange = async (
	context: KanbanViewBoardServiceContext,
	color: string | undefined,
): Promise<void> => {
	const file = context.getFile();
	if (!file) {
		notice('Kanban board file not found.');
		return;
	}
	const normalized = normalizeHexColor(color) ?? undefined;
	try {
		await updateFrontmatterColor(context.app, file, context.boardColorProperty, normalized);
	} catch (error) {
		console.error('Failed to update board color', error);
		notice('Failed to update board color.');
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
