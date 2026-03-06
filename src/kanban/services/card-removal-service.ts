import type { EventLocation } from '../../shared/event/types';
import {
	type FrontmatterMetadataApp,
	readFrontmatterString,
} from '../../shared/frontmatter/file-frontmatter';
import { extractFirstWikiLinkPath } from '../../shared/utils/wiki-link';
import type { RemoveCardOptions, KanbanBoard } from '../types';
import { resolveLinkedCardFile } from './card-service';
import { findCardById, removeCard } from './model-service';

type CardFileLike = {
	path: string;
};
type CardRemovalApp = FrontmatterMetadataApp & {
	metadataCache: FrontmatterMetadataApp['metadataCache'] & {
		getFirstLinkpathDest(path: string, sourcePath: string): CardFileLike | null;
	};
	fileManager: {
		trashFile(file: CardFileLike): Promise<void>;
	};
};

type CardRemovalCalendar = {
	deleteEvent: (location: EventLocation) => Promise<void>;
};

type CardRemovalDeps = {
	app: CardRemovalApp;
	board: KanbanBoard | null;
	sourceFile: CardFileLike | null;
	cardId: string;
	options?: RemoveCardOptions;
	calendar: { getCalendar: () => CardRemovalCalendar } | null;
	applyBoardMutation: (mutate: (board: KanbanBoard) => KanbanBoard) => Promise<boolean>;
	cardEventProperty: string;
	notice: (message: string) => void;
};

export type CardRemovalTargets = {
	linkedCardFile: CardFileLike | null;
	linkedEventFile: CardFileLike | null;
};

function hasFilePath(file: unknown): file is CardFileLike {
	if (!file || typeof file !== 'object') return false;
	const path = (file as { path?: unknown }).path;
	return typeof path === 'string';
}

function resolveLinkedEventFile(
	app: CardRemovalApp,
	linkedCardFile: CardFileLike,
	cardEventProperty: string,
): CardFileLike | null {
	const eventLink = readFrontmatterString(app, linkedCardFile, cardEventProperty);
	if (!eventLink) return null;
	const eventPath = extractFirstWikiLinkPath(eventLink);
	if (!eventPath) return null;
	const eventFile = app.metadataCache.getFirstLinkpathDest(eventPath, linkedCardFile.path);
	return hasFilePath(eventFile) ? eventFile : null;
}

export function getDeleteLinkedNoteLabel(hasLinkedEvent: boolean): string {
	return hasLinkedEvent ? 'Also delete linked note and linked event' : 'Also delete linked note';
}

export function resolveCardRemovalTargets(
	app: CardRemovalApp,
	sourceFilePath: string,
	title: string,
	cardEventProperty: string,
): CardRemovalTargets {
	const linkedCardFile = resolveLinkedCardFile(app, sourceFilePath, title);
	if (!linkedCardFile) {
		return {
			linkedCardFile: null,
			linkedEventFile: null,
		};
	}
	return {
		linkedCardFile,
		linkedEventFile: resolveLinkedEventFile(app, linkedCardFile, cardEventProperty),
	};
}

function buildEventLocation(file: CardFileLike): EventLocation {
	return {
		file: { path: file.path },
		lineNumber: undefined,
	};
}

async function removeCardOnly(
	board: KanbanBoard,
	cardId: string,
	applyBoardMutation: (mutate: (board: KanbanBoard) => KanbanBoard) => Promise<boolean>,
): Promise<void> {
	await applyBoardMutation((nextBoard) => removeCard(nextBoard, cardId));
}

export async function removeCardWithLinkedCleanup({
	app,
	board,
	sourceFile,
	cardId,
	options,
	calendar,
	applyBoardMutation,
	cardEventProperty,
	notice,
}: CardRemovalDeps): Promise<void> {
	if (!board) return;
	if (!options?.deleteLinkedNote) {
		await removeCardOnly(board, cardId, applyBoardMutation);
		return;
	}

	const card = findCardById(board, cardId);
	if (!card) return;
	if (!sourceFile) {
		await removeCardOnly(board, cardId, applyBoardMutation);
		return;
	}

	const targets = resolveCardRemovalTargets(app, sourceFile.path, card.title, cardEventProperty);
	if (!targets.linkedCardFile) {
		await removeCardOnly(board, cardId, applyBoardMutation);
		return;
	}

	if (targets.linkedEventFile) {
		const noteCalendar = calendar?.getCalendar();
		if (!noteCalendar) {
			notice('Calendar is not ready. Card was not removed.');
			return;
		}
		try {
			await noteCalendar.deleteEvent(buildEventLocation(targets.linkedEventFile));
		} catch (error) {
			console.error('Failed to delete linked event', error);
			notice('Failed to delete the linked event. Card was not removed.');
			return;
		}
	}

	try {
		await app.fileManager.trashFile(targets.linkedCardFile);
	} catch (error) {
		console.error('Failed to delete linked note', error);
		notice('Failed to delete the linked note. Card was not removed.');
		return;
	}

	await removeCardOnly(board, cardId, applyBoardMutation);
}
