import { parseWikiLinkParts } from '../../shared/utils/wiki-link';
import type { KanbanBoard, KanbanCard } from '../types';
import { splitCardTitle } from '../utils/card-title';
import { resolveLinkedCardFile } from './card-service';
import { serializeKanbanBoard } from './parser-service';
import type { CleanupApp, CleanupBoardSource, CleanupFile } from './startup-cleanup-discovery';

function getLinkDisplayText(linktext: string, linkedFile: CleanupFile): string {
	const parts = parseWikiLinkParts(linktext);
	if (parts?.alias) return parts.alias;
	return linkedFile.basename;
}

export function unlinkFirstWikiLinkTitle(title: string, linkedFile: CleanupFile): string {
	const { titleLine, rest } = splitCardTitle(title);
	const nextTitleLine = titleLine.replace(/\[\[([^\]]+)\]\]/, (_match, linktext: string) =>
		getLinkDisplayText(linktext, linkedFile),
	);
	return rest ? `${nextTitleLine}\n${rest}` : nextTitleLine;
}

function unlinkCardIfTargeted(
	linkedCardFile: CleanupFile | undefined,
	targetCardPaths: Set<string>,
	card: KanbanCard,
): { card: KanbanCard; changed: boolean } {
	if (!linkedCardFile || !targetCardPaths.has(linkedCardFile.path)) {
		return { card, changed: false };
	}
	const nextTitle = unlinkFirstWikiLinkTitle(card.title, linkedCardFile);
	if (nextTitle === card.title) return { card, changed: false };
	return { card: { ...card, title: nextTitle }, changed: true };
}

function unlinkBoardCardLinks(
	board: KanbanBoard,
	linkedCardFilesById: ReadonlyMap<string, CleanupFile>,
	targetCardPaths: Set<string>,
): { board: KanbanBoard; changedCards: number } {
	let changedCards = 0;
	const lanes = board.lanes.map((lane) => {
		let laneChanged = false;
		const cards = lane.cards.map((card) => {
			const result = unlinkCardIfTargeted(linkedCardFilesById.get(card.id), targetCardPaths, card);
			if (result.changed) {
				laneChanged = true;
				changedCards += 1;
			}
			return result.card;
		});
		return laneChanged ? { ...lane, cards } : lane;
	});
	return changedCards > 0 ? { board: { ...board, lanes }, changedCards } : { board, changedCards };
}

type BoardCardLinkCleanupPlan = {
	boardSources: CleanupBoardSource[];
	linkedCardFilesByBoardPath: Map<string, Map<string, CleanupFile>>;
};

export function createBoardCardLinkCleanupPlan(
	app: CleanupApp,
	boardSources: CleanupBoardSource[],
	targetCardPaths: ReadonlySet<string>,
): BoardCardLinkCleanupPlan {
	const linkedCardFilesByBoardPath = new Map<string, Map<string, CleanupFile>>();
	for (const { file: boardFile, board } of boardSources) {
		const linkedCardFilesById = new Map<string, CleanupFile>();
		for (const lane of board.lanes) {
			for (const card of lane.cards) {
				const linkedCardFile = resolveLinkedCardFile(app, boardFile.path, card.title);
				if (!linkedCardFile || !targetCardPaths.has(linkedCardFile.path)) continue;
				linkedCardFilesById.set(card.id, linkedCardFile);
			}
		}
		if (linkedCardFilesById.size > 0) {
			linkedCardFilesByBoardPath.set(boardFile.path, linkedCardFilesById);
		}
	}
	return { boardSources, linkedCardFilesByBoardPath };
}

export async function clearKanbanCardLinks(
	app: CleanupApp,
	plan: BoardCardLinkCleanupPlan,
	targetCardPaths: Set<string>,
): Promise<{ boardsUpdated: number; cardLinksCleared: number }> {
	let boardsUpdated = 0;
	let cardLinksCleared = 0;

	for (const { file, markdown, board } of plan.boardSources) {
		const linkedCardFilesById = plan.linkedCardFilesByBoardPath.get(file.path);
		if (!linkedCardFilesById) continue;
		if (app.vault.getAbstractFileByPath(file.path) !== file) continue;
		let freshMarkdown: string;
		try {
			freshMarkdown = await app.vault.read(file);
		} catch (error) {
			console.error(`Failed to revalidate kanban cleanup target: ${file.path}`, error);
			continue;
		}
		if (app.vault.getAbstractFileByPath(file.path) !== file || freshMarkdown !== markdown) {
			continue;
		}
		const result = unlinkBoardCardLinks(board, linkedCardFilesById, targetCardPaths);
		if (result.changedCards === 0) continue;
		await app.vault.modify(file, serializeKanbanBoard(result.board, markdown));
		boardsUpdated += 1;
		cardLinksCleared += result.changedCards;
	}

	return { boardsUpdated, cardLinksCleared };
}
