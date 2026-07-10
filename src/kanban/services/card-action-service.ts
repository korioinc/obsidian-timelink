import { normalizeHexColor } from '../../shared/color/normalize-hex-color';
import type { EventLocation } from '../../shared/event/types';
import {
	removeFrontmatterKey,
	setFrontmatterValue,
} from '../../shared/frontmatter/file-frontmatter';
import { KANBAN_BOARD_COLOR_KEY } from '../../shared/frontmatter/kanban-frontmatter';
import type { KanbanBoard } from '../types';
import { resolveCardDisplayTitle } from '../utils/card-display-title';
import { splitCardTitle } from '../utils/card-title';
import {
	cardFileHasEventLink,
	ensureCardTextFile,
	resolveEventCardBacklinkFromCardTitle,
	resolveLinkedCardFile,
} from './card-service';
import { findCardBlockId, findCardById } from './model-service';
import type { App, TFile } from 'obsidian';

type CalendarGateway = {
	getCalendar: () => {
		createEvent: (event: {
			title: string;
			allDay: boolean;
			date: string;
			color?: string;
			creator: 'kanban';
		}) => Promise<EventLocation>;
		deleteEvent: (location: EventLocation) => Promise<unknown>;
	};
};
type CardActionCalendar = ReturnType<CalendarGateway['getCalendar']>;
type FrontmatterPropertySnapshot = {
	captured: boolean;
	present: boolean;
	value: unknown;
};

export type CardActionContext = {
	app: App;
	file: TFile;
	board: KanbanBoard | null;
	calendar: CalendarGateway | null;
	getTodayDateKey: () => string;
	cardEventProperty: string;
	eventCardProperty: string;
	getCardTitle: (cardId: string) => string | null;
	ensureCardBlockId: (cardId: string) => Promise<string | null>;
	updateCardTitleWithLink: (cardId: string, link: string, originalTitle: string) => Promise<void>;
	notice: (message: string) => void;
};

const isSameTFileKind = (file: unknown, referenceFile: TFile): file is TFile => {
	if (!file || typeof file !== 'object') return false;
	if (file.constructor !== referenceFile.constructor) return false;
	const candidate = file as { path?: unknown; basename?: unknown };
	return typeof candidate.path === 'string' && typeof candidate.basename === 'string';
};

const deleteIncompleteEvent = async (
	calendar: CardActionCalendar,
	location: EventLocation,
): Promise<boolean> => {
	try {
		await calendar.deleteEvent(location);
		return true;
	} catch (error) {
		console.error('Failed to remove incomplete event created from card', error);
		return false;
	}
};

const noticeEventCreationRollback = (
	context: CardActionContext,
	eventRemoved: boolean,
	eventPath: string,
): void => {
	context.notice(
		eventRemoved
			? 'Failed to create event from card. The incomplete event was removed; the card note was kept for retry.'
			: `Event creation was incomplete. The event remains at ${eventPath}; remove or repair it before retrying.`,
	);
};

const setFrontmatterValueWithSnapshot = async (
	context: CardActionContext,
	file: TFile,
	key: string,
	value: unknown,
	snapshot: FrontmatterPropertySnapshot,
): Promise<void> => {
	await context.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		snapshot.captured = true;
		snapshot.present = Object.prototype.hasOwnProperty.call(frontmatter, key);
		snapshot.value = frontmatter[key];
		frontmatter[key] = value;
	});
};

const restoreFrontmatterSnapshot = async (
	context: CardActionContext,
	file: TFile,
	key: string,
	snapshot: FrontmatterPropertySnapshot,
): Promise<void> => {
	if (!snapshot.captured) return;
	if (snapshot.present) {
		await setFrontmatterValue(context.app, file, key, snapshot.value);
		return;
	}
	await removeFrontmatterKey(context.app, file, key);
};

export async function createNoteFromCard(
	context: CardActionContext,
	cardId: string,
): Promise<void> {
	const title = context.getCardTitle(cardId)?.trim();
	if (!title) return;
	const { titleLine } = splitCardTitle(title);
	if (!titleLine) return;
	const linkedCardFile = resolveLinkedCardFile(context.app, context.file.path, title);
	if (linkedCardFile) {
		context.notice('Card already links to a file.');
		return;
	}
	const newFile = await ensureCardTextFile(context.app, context.file.path, titleLine);
	const leaf = context.app.workspace.getLeaf('split');
	await leaf.openFile(newFile);
	const link = context.app.fileManager.generateMarkdownLink(
		newFile,
		context.file.path,
		'',
		titleLine,
	);
	await context.updateCardTitleWithLink(cardId, link, title);
}

type PreparedEventCard = {
	board: KanbanBoard;
	calendar: CardActionCalendar;
	cardFile: TFile;
};

const prepareEventCard = async (
	context: CardActionContext,
	cardId: string,
): Promise<PreparedEventCard | null> => {
	if (!context.calendar) {
		context.notice('Calendar is not ready.');
		return null;
	}
	const board = context.board;
	if (!board) return null;
	const card = findCardById(board, cardId);
	if (!card) return null;
	const title = card.title.trim();
	if (!title) return null;
	const { titleLine } = splitCardTitle(title);
	if (!titleLine) return null;

	const linkedCardFile = resolveLinkedCardFile(context.app, context.file.path, title);
	let cardFile: TFile;
	try {
		cardFile =
			linkedCardFile ?? (await ensureCardTextFile(context.app, context.file.path, titleLine));
	} catch (error) {
		console.error('Failed to prepare card note for event creation', error);
		context.notice('Failed to prepare the card note for event creation.');
		return null;
	}

	if (!linkedCardFile) {
		const displayTitle = resolveCardDisplayTitle(titleLine, cardFile.basename);
		const cardTitleLink = `[[${cardFile.path}|${displayTitle}]]`;
		try {
			await context.updateCardTitleWithLink(cardId, cardTitleLink, title);
		} catch (error) {
			console.error('Failed to link card note before event creation', error);
			context.notice(
				'Failed to prepare the card note for event creation. The card note was kept so you can retry.',
			);
			return null;
		}
	}

	if (cardFileHasEventLink(context.app, cardFile, context.cardEventProperty)) {
		context.notice('Card already links to an event.');
		return null;
	}
	return { board, calendar: context.calendar.getCalendar(), cardFile };
};

const createCardEvent = async (
	context: CardActionContext,
	prepared: PreparedEventCard,
): Promise<EventLocation | null> => {
	try {
		return await prepared.calendar.createEvent({
			title: prepared.cardFile.basename,
			allDay: true,
			date: context.getTodayDateKey(),
			color: normalizeHexColor(prepared.board.settings?.[KANBAN_BOARD_COLOR_KEY]) ?? undefined,
			creator: 'kanban',
		});
	} catch (error) {
		console.error('Failed to create event from card', error);
		context.notice('Failed to create event from card. The card note was kept so you can retry.');
		return null;
	}
};

const linkCreatedEvent = async (
	context: CardActionContext,
	prepared: PreparedEventCard,
	location: EventLocation,
	eventFile: TFile,
): Promise<boolean> => {
	const cardPropertyLink = `[[${prepared.cardFile.path}]]`;
	try {
		await setFrontmatterValue(context.app, eventFile, context.eventCardProperty, cardPropertyLink);
	} catch (error) {
		console.error('Failed to link created event to card note', error);
		noticeEventCreationRollback(
			context,
			await deleteIncompleteEvent(prepared.calendar, location),
			location.file.path,
		);
		return false;
	}

	const cardEventSnapshot: FrontmatterPropertySnapshot = {
		captured: false,
		present: false,
		value: undefined,
	};
	try {
		await setFrontmatterValueWithSnapshot(
			context,
			prepared.cardFile,
			context.cardEventProperty,
			`[[${eventFile.path}]]`,
			cardEventSnapshot,
		);
		return true;
	} catch (error) {
		console.error('Failed to link card note to created event', error);
		try {
			await restoreFrontmatterSnapshot(
				context,
				prepared.cardFile,
				context.cardEventProperty,
				cardEventSnapshot,
			);
		} catch (rollbackError) {
			console.error('Failed to roll back partial card event link', rollbackError);
			context.notice(
				'Event creation was incomplete. Links may be partially saved, so the event and card note were kept for recovery.',
			);
			return false;
		}
		noticeEventCreationRollback(
			context,
			await deleteIncompleteEvent(prepared.calendar, location),
			location.file.path,
		);
		return false;
	}
};

export async function createEventFromCard(
	context: CardActionContext,
	cardId: string,
): Promise<void> {
	const prepared = await prepareEventCard(context, cardId);
	if (!prepared) return;
	const location = await createCardEvent(context, prepared);
	if (!location) return;
	const eventFile = context.app.vault.getAbstractFileByPath(location.file.path);
	if (!isSameTFileKind(eventFile, context.file)) {
		console.error('Created event location did not resolve to a file', location.file.path);
		noticeEventCreationRollback(
			context,
			await deleteIncompleteEvent(prepared.calendar, location),
			location.file.path,
		);
		return;
	}
	if (!(await linkCreatedEvent(context, prepared, location, eventFile))) return;
	context.notice('Event created from card.');
}

export async function copyCardLink(context: CardActionContext, cardId: string): Promise<void> {
	const title = context.getCardTitle(cardId)?.trim() ?? '';
	const eventBacklink = resolveEventCardBacklinkFromCardTitle(
		context.app,
		context.file.path,
		title,
		context.cardEventProperty,
		context.eventCardProperty,
	);
	if (eventBacklink) {
		await navigator.clipboard.writeText(eventBacklink);
		return;
	}
	if (!context.board) return;
	const existingBlockId = findCardBlockId(context.board, cardId);
	if (existingBlockId) {
		const fallbackLink = context.app.fileManager.generateMarkdownLink(
			context.file,
			'',
			`#^${existingBlockId}`,
		);
		await navigator.clipboard.writeText(fallbackLink);
		return;
	}
	const nextId = await context.ensureCardBlockId(cardId);
	if (!nextId) return;
	const fallbackLink = context.app.fileManager.generateMarkdownLink(
		context.file,
		'',
		`#^${nextId}`,
	);
	await navigator.clipboard.writeText(fallbackLink);
}
