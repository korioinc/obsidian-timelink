import { normalizeHexColor } from '../color/normalize-hex-color';
import { extractFrontmatterBody, parseFrontmatterValue } from './markdown-frontmatter';

export const KANBAN_FRONTMATTER_KEY = 'kanban-plugin';
export const KANBAN_FRONTMATTER_VALUE = 'board';
export const KANBAN_BOARD_COLOR_KEY = 'kanban-color';

export const hasKanbanBoardFrontmatter = (frontmatterBody: string): boolean =>
	parseFrontmatterValue(frontmatterBody, KANBAN_FRONTMATTER_KEY) === KANBAN_FRONTMATTER_VALUE;

export const readKanbanBoardColorFromFrontmatter = (
	frontmatterBody: string,
): string | undefined => {
	const value = parseFrontmatterValue(frontmatterBody, KANBAN_BOARD_COLOR_KEY, {
		caseInsensitive: true,
	});
	return value ? (normalizeHexColor(value) ?? undefined) : undefined;
};

export const scanKanbanBoardFrontmatter = (
	markdown: string,
): { hasKanban: boolean; kanbanColor?: string } => {
	const frontmatterBody = extractFrontmatterBody(markdown);
	if (!frontmatterBody) {
		return { hasKanban: false };
	}
	return {
		hasKanban: hasKanbanBoardFrontmatter(frontmatterBody),
		kanbanColor: readKanbanBoardColorFromFrontmatter(frontmatterBody),
	};
};

export const readKanbanBoardColorFromMarkdown = (markdown: string): string | undefined =>
	scanKanbanBoardFrontmatter(markdown).kanbanColor;
