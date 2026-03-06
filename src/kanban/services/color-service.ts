import { normalizeHexColor } from '../../shared/color/normalize-hex-color';
import {
	readFrontmatterString,
	removeFrontmatterKey,
	setFrontmatterValue,
} from '../../shared/frontmatter/file-frontmatter';
import {
	KANBAN_BOARD_COLOR_KEY,
	readKanbanBoardColorFromMarkdown,
} from '../../shared/frontmatter/kanban-frontmatter';
import {
	extractFrontmatterBody,
	parseFrontmatterValue,
} from '../../shared/frontmatter/markdown-frontmatter';
import type { App, TFile } from 'obsidian';

function readBoardColorFromMetadata(
	app: App,
	file: TFile | null | undefined,
	key: string,
): string | undefined {
	if (!file) return undefined;
	const color = readFrontmatterString(app, file, key);
	if (!color) return undefined;
	return normalizeHexColor(color) ?? undefined;
}

export function readBoardColorFromMarkdown(markdown: string, key: string): string | undefined {
	if (key === KANBAN_BOARD_COLOR_KEY) {
		return readKanbanBoardColorFromMarkdown(markdown);
	}
	const frontmatterBody = extractFrontmatterBody(markdown);
	if (!frontmatterBody) return undefined;
	const value = parseFrontmatterValue(frontmatterBody, key, { caseInsensitive: true });
	return value ? (normalizeHexColor(value) ?? undefined) : undefined;
}

export function resolveBoardColor(
	app: App,
	file: TFile | null | undefined,
	markdown: string,
	key: string,
): string | undefined {
	return readBoardColorFromMetadata(app, file, key) ?? readBoardColorFromMarkdown(markdown, key);
}

export async function updateFrontmatterColor(
	app: App,
	file: TFile,
	key: string,
	color: string | undefined,
): Promise<void> {
	if (color) {
		await setFrontmatterValue(app, file, key, color);
		return;
	}
	await removeFrontmatterKey(app, file, key);
}
