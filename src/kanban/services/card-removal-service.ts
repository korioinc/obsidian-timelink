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
	deleteEvent: (location: EventLocation) => Promise<unknown>;
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

type CardRemovalTargets = {
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
	cardId: string,
	applyBoardMutation: (mutate: (board: KanbanBoard) => KanbanBoard) => Promise<boolean>,
): Promise<boolean> {
	return applyBoardMutation((nextBoard) => removeCard(nextBoard, cardId));
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
		await removeCardOnly(cardId, applyBoardMutation);
		return;
	}

	const card = findCardById(board, cardId);
	if (!card) return;
	if (!sourceFile) {
		await removeCardOnly(cardId, applyBoardMutation);
		return;
	}

	const targets = resolveCardRemovalTargets(app, sourceFile.path, card.title, cardEventProperty);
	if (!targets.linkedCardFile) {
		await removeCardOnly(cardId, applyBoardMutation);
		return;
	}

	let noteCalendar: CardRemovalCalendar | null = null;
	if (targets.linkedEventFile) {
		noteCalendar = calendar?.getCalendar() ?? null;
		if (!noteCalendar) {
			notice('Calendar is not ready. Card was not removed.');
			return;
		}
	}

	let cardRemoved: boolean;
	try {
		cardRemoved = await removeCardOnly(cardId, applyBoardMutation);
	} catch (error) {
		console.error('Failed to remove card before linked cleanup', error);
		notice(
			targets.linkedEventFile
				? 'Could not confirm card removal. Linked note and event were not deleted.'
				: 'Could not confirm card removal. Linked note was not deleted.',
		);
		return;
	}
	if (!cardRemoved) {
		notice(
			targets.linkedEventFile
				? 'Failed to remove the card. Linked note and event were not deleted.'
				: 'Failed to remove the card. Linked note was not deleted.',
		);
		return;
	}

	if (targets.linkedEventFile && noteCalendar) {
		try {
			await noteCalendar.deleteEvent(buildEventLocation(targets.linkedEventFile));
		} catch (error) {
			console.error('Failed to delete linked event', error);
			notice(
				'Card removed, but failed to delete the linked event. The linked note was not deleted.',
			);
			return;
		}
	}

	try {
		await app.fileManager.trashFile(targets.linkedCardFile);
	} catch (error) {
		console.error('Failed to delete linked note', error);
		notice(
			targets.linkedEventFile
				? 'Card and linked event were removed, but failed to delete the linked note.'
				: 'Card removed, but failed to delete the linked note.',
		);
		return;
	}
}
