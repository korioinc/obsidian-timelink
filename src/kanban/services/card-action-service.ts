import { normalizeHexColor } from '../../shared/color/normalize-hex-color';
import { setFrontmatterValue } from '../../shared/frontmatter/file-frontmatter';
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
import type { App } from 'obsidian';
import { Notice, TFile } from 'obsidian';

type CalendarGateway = {
	getCalendar: () => {
		createEvent: (event: {
			title: string;
			allDay: boolean;
			date: string;
			color?: string;
			creator: 'kanban';
		}) => Promise<{ file: { path: string } }>;
	};
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
		new Notice('Card already links to a file.');
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

export async function createEventFromCard(
	context: CardActionContext,
	cardId: string,
): Promise<void> {
	if (!context.calendar) {
		new Notice('Calendar is not ready.');
		return;
	}
	if (!context.board) return;
	const card = findCardById(context.board, cardId);
	if (!card) return;

	const title = card.title.trim();
	if (!title) return;
	const { titleLine } = splitCardTitle(title);
	if (!titleLine) return;
	const linkedCardFile = resolveLinkedCardFile(context.app, context.file.path, title);
	const cardFile =
		linkedCardFile ?? (await ensureCardTextFile(context.app, context.file.path, titleLine));
	const dateKey = context.getTodayDateKey();
	const eventTitle = cardFile.basename;
	if (linkedCardFile && cardFileHasEventLink(context.app, cardFile, context.cardEventProperty)) {
		new Notice('Card already links to an event.');
		return;
	}

	const event = {
		title: eventTitle,
		allDay: true,
		date: dateKey,
		color: normalizeHexColor(context.board.settings?.[KANBAN_BOARD_COLOR_KEY]) ?? undefined,
		creator: 'kanban' as const,
	};

	try {
		const location = await context.calendar.getCalendar().createEvent(event);
		const eventFile = context.app.vault.getAbstractFileByPath(location.file.path);
		if (eventFile && eventFile instanceof TFile) {
			const eventPropertyLink = `[[${eventFile.path}]]`;
			const cardPropertyLink = `[[${cardFile.path}]]`;
			const displayTitle = resolveCardDisplayTitle(titleLine, cardFile.basename);
			const cardTitleLink = `[[${cardFile.path}|${displayTitle}]]`;
			await setFrontmatterValue(
				context.app,
				cardFile,
				context.cardEventProperty,
				eventPropertyLink,
			);
			await setFrontmatterValue(
				context.app,
				eventFile,
				context.eventCardProperty,
				cardPropertyLink,
			);
			await context.updateCardTitleWithLink(cardId, cardTitleLink, title);
		}
		new Notice('Event created from card.');
	} catch (error) {
		console.error('Failed to create event from card', error);
		new Notice('Failed to create event from card.');
	}
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
