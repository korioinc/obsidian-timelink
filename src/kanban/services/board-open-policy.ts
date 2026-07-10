import {
	KANBAN_FRONTMATTER_KEY,
	KANBAN_FRONTMATTER_VALUE,
} from '../../shared/frontmatter/kanban-frontmatter';
import { isKanbanBoard } from './parser-service';

type KanbanFileCache = {
	frontmatter?: Record<string, unknown>;
} | null;

type KanbanOpenDecision = 'allow' | 'deny' | 'inspect';

export const readCachedKanbanMarker = (cache: KanbanFileCache): boolean | null => {
	if (!cache) return null;
	return cache.frontmatter?.[KANBAN_FRONTMATTER_KEY] === KANBAN_FRONTMATTER_VALUE;
};

export const resolveKanbanOpenDecision = (
	extension: string,
	cachedMarker: boolean | null,
): KanbanOpenDecision => {
	if (extension !== 'md' && extension !== 'kanban') return 'deny';
	if (cachedMarker === true) return 'allow';
	if (cachedMarker === false) return 'deny';
	return 'inspect';
};

export const inspectKanbanBoardFile = async (
	extension: string,
	cachedMarker: boolean | null,
	readMarkdown: () => Promise<string>,
): Promise<boolean> => {
	if (extension !== 'md' && extension !== 'kanban') return false;
	if (cachedMarker !== null) return cachedMarker;
	return isKanbanBoard(await readMarkdown());
};
