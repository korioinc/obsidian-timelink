import { hasKanbanBoardFrontmatter } from '../../shared/frontmatter/kanban-frontmatter';
import { extractFrontmatterBody } from '../../shared/frontmatter/markdown-frontmatter';
import type { KanbanBoard, KanbanLane } from '../types';
import { stripSettingsFooterFromLines } from '../utils/settings-footer';
import { parseBoardSettingsFooter, serializeBoardSettingsFooter } from './settings-service';

const headingPattern = /^##\s+(.*)$/;
const cardPattern = /^-\s+\[([ xX])\]\s+(.*)$/;
const blockIdPattern = /^(.*?)(?:\s+\^([A-Za-z0-9-]+))?$/;
const checkboxPatterns = [/^\[\s\]\s+/, /^\[[xX]\]\s+/];

export function isKanbanBoard(markdown: string): boolean {
	const frontmatterBody = extractFrontmatterBody(markdown);
	if (!frontmatterBody) return false;
	return hasKanbanBoardFrontmatter(frontmatterBody);
}

export function parseKanbanBoard(markdown: string): KanbanBoard {
	const lines = markdown.split('\n');
	const lanes: KanbanLane[] = [];
	let currentLane: KanbanLane | null = null;

	const pushLane = () => {
		if (!currentLane) return;
		lanes.push(currentLane);
	};

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		const headingMatch = line.match(headingPattern);
		if (headingMatch?.[1] !== undefined) {
			if (currentLane) {
				pushLane();
			}

			currentLane = {
				id: `lane-${lanes.length}`,
				title: headingMatch[1].trim(),
				cards: [],
			};
			continue;
		}

		if (!currentLane) continue;

		const cardMatch = line.match(cardPattern);
		if (cardMatch?.[2] !== undefined) {
			const parsed = blockIdPattern.exec(cardMatch[2].trim());
			const rawTitle = parsed?.[1]?.trim() ?? cardMatch[2].trim();
			const blockId = parsed?.[2]?.trim();
			const titleLines: string[] = [rawTitle];

			let cursor = index + 1;
			while (cursor < lines.length) {
				const nextLine = lines[cursor] ?? '';
				if (nextLine.match(headingPattern)) break;
				if (nextLine.match(cardPattern)) break;
				if (nextLine.startsWith('  ') || nextLine.startsWith('\t') || nextLine === '') {
					const trimmed = nextLine === '' ? '' : nextLine.replace(/^(?:\t| {2})/, '');
					titleLines.push(trimmed);
					cursor += 1;
					continue;
				}
				break;
			}

			index = cursor - 1;
			while (titleLines.length > 1 && titleLines[titleLines.length - 1] === '') {
				titleLines.pop();
			}
			const cardTitle = titleLines.join('\n').replace(/<br\s*\/?\s*>/gi, '\n');

			currentLane.cards.push({
				id: `card-${currentLane.cards.length}-${index}`,
				title: cardTitle,
				blockId: blockId || undefined,
			});
		}
	}

	pushLane();

	return { lanes, settings: parseBoardSettingsFooter(markdown) };
}

function getFrontmatterEndIndex(lines: string[]): number {
	const start = lines.indexOf('---');
	if (start === -1) return -1;
	for (let i = start + 1; i < lines.length; i += 1) {
		if (lines[i] === '---') return i;
	}
	return -1;
}

function stripCheckboxPrefix(title: string): string {
	let next = title.trimStart();
	checkboxPatterns.forEach((pattern) => {
		next = next.replace(pattern, '');
	});
	return next.trim();
}

function ensureBlankLine(output: string[]): void {
	if (output.length === 0) return;
	if (output[output.length - 1] !== '') output.push('');
}

function trimBlankEdges(lines: string[]): string[] {
	let start = 0;
	let end = lines.length;
	while (start < end && lines[start]?.trim() === '') start += 1;
	while (end > start && lines[end - 1]?.trim() === '') end -= 1;
	return lines.slice(start, end);
}

function splitPreservedMarkdownBody(
	lines: string[],
	bodyStartIndex: number,
): {
	beforeBoard: string[];
	afterBoard: string[];
	afterLaneById: Map<string, string[]>;
} {
	const ownedLineIndexes = new Set<number>();
	const laneIdByLineIndex = new Map<number, string>();
	let firstBoardLineIndex = -1;
	let lastBoardLineIndex = -1;
	let currentLaneId: string | null = null;
	let laneIndex = 0;

	for (let index = bodyStartIndex; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		if (headingPattern.test(line)) {
			currentLaneId = `lane-${laneIndex}`;
			laneIndex += 1;
			if (firstBoardLineIndex === -1) firstBoardLineIndex = index;
			lastBoardLineIndex = index;
			ownedLineIndexes.add(index);
			laneIdByLineIndex.set(index, currentLaneId);
			continue;
		}
		if (!currentLaneId) continue;
		laneIdByLineIndex.set(index, currentLaneId);
		if (!cardPattern.test(line)) continue;

		ownedLineIndexes.add(index);
		lastBoardLineIndex = index;
		let cursor = index + 1;
		while (cursor < lines.length) {
			const continuation = lines[cursor] ?? '';
			if (continuation !== '' && !continuation.startsWith('  ') && !continuation.startsWith('\t')) {
				break;
			}
			ownedLineIndexes.add(cursor);
			laneIdByLineIndex.set(cursor, currentLaneId);
			lastBoardLineIndex = cursor;
			cursor += 1;
		}
		index = cursor - 1;
	}

	if (firstBoardLineIndex === -1) {
		return {
			beforeBoard: trimBlankEdges(lines.slice(bodyStartIndex)),
			afterBoard: [],
			afterLaneById: new Map(),
		};
	}

	const afterLaneById = new Map<string, string[]>();
	for (let index = firstBoardLineIndex; index <= lastBoardLineIndex; index += 1) {
		if (ownedLineIndexes.has(index)) continue;
		const laneId = laneIdByLineIndex.get(index);
		if (!laneId) continue;
		const preservedLines = afterLaneById.get(laneId) ?? [];
		preservedLines.push(lines[index] ?? '');
		afterLaneById.set(laneId, preservedLines);
	}
	for (const [laneId, preservedLines] of afterLaneById) {
		const trimmedLines = trimBlankEdges(preservedLines);
		if (trimmedLines.length === 0) {
			afterLaneById.delete(laneId);
		} else {
			afterLaneById.set(laneId, trimmedLines);
		}
	}

	return {
		beforeBoard: trimBlankEdges(lines.slice(bodyStartIndex, firstBoardLineIndex)),
		afterBoard: trimBlankEdges(lines.slice(lastBoardLineIndex + 1)),
		afterLaneById,
	};
}

function appendSection(output: string[], lines: string[]): void {
	if (lines.length === 0) return;
	ensureBlankLine(output);
	output.push(...lines);
}

export function serializeKanbanBoard(board: KanbanBoard, original: string): string {
	const lines = stripSettingsFooterFromLines(original.split('\n'));
	const output: string[] = [];
	const boardLines: string[] = [];
	const frontmatterEnd = getFrontmatterEndIndex(lines);
	let lineIndex = frontmatterEnd !== -1 ? frontmatterEnd + 1 : 0;
	const preservedBody = splitPreservedMarkdownBody(lines, lineIndex);

	for (let i = 0; i < lineIndex; i += 1) {
		const line = lines[i];
		if (line !== undefined) output.push(line);
	}

	const consumedPreservedLaneIds = new Set<string>();
	board.lanes.forEach((lane, laneIndex) => {
		if (laneIndex > 0) boardLines.push('');
		boardLines.push(`## ${lane.title}`);
		boardLines.push('');

		lane.cards.forEach((card) => {
			const suffix = card.blockId ? ` ^${card.blockId}` : '';
			const normalized = stripCheckboxPrefix(card.title).replace(/\r\n/g, '\n');
			const lines = normalized.split('\n');
			const firstLine = lines.shift() ?? '';
			boardLines.push(`- [ ] ${firstLine}${suffix}`);
			lines.forEach((line) => {
				boardLines.push(`  ${line}`);
			});
		});

		const preservedLaneLines = preservedBody.afterLaneById.get(lane.id) ?? [];
		appendSection(boardLines, preservedLaneLines);
		consumedPreservedLaneIds.add(lane.id);
	});
	for (const [laneId, preservedLaneLines] of preservedBody.afterLaneById) {
		if (consumedPreservedLaneIds.has(laneId)) continue;
		appendSection(boardLines, preservedLaneLines);
	}

	appendSection(output, preservedBody.beforeBoard);
	appendSection(output, boardLines);
	appendSection(output, preservedBody.afterBoard);

	const settingsFooter = serializeBoardSettingsFooter(board.settings);
	if (settingsFooter) {
		output.push(settingsFooter);
	}

	return output.join('\n').trimEnd() + '\n';
}
