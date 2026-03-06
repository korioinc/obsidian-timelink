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

	const pushLane = (endIndex: number) => {
		if (!currentLane) return;
		currentLane.lineEnd = endIndex;
		lanes.push(currentLane);
	};

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		const headingMatch = line.match(headingPattern);
		if (headingMatch?.[1] !== undefined) {
			if (currentLane) {
				pushLane(index);
			}

			currentLane = {
				id: `lane-${lanes.length}`,
				title: headingMatch[1].trim(),
				lineStart: index,
				lineEnd: index,
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
				lineStart: index,
				blockId: blockId || undefined,
			});
		}
	}

	pushLane(lines.length);

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

export function serializeKanbanBoard(board: KanbanBoard, original: string): string {
	const lines = stripSettingsFooterFromLines(original.split('\n'));
	const output: string[] = [];
	const frontmatterEnd = getFrontmatterEndIndex(lines);
	let lineIndex = frontmatterEnd !== -1 ? frontmatterEnd + 1 : 0;

	for (let i = 0; i < lineIndex; i += 1) {
		const line = lines[i];
		if (line !== undefined) output.push(line);
	}

	if (lineIndex > 0) {
		ensureBlankLine(output);
	}

	board.lanes.forEach((lane, laneIndex) => {
		if (laneIndex > 0) output.push('');
		output.push(`## ${lane.title}`);
		output.push('');

		lane.cards.forEach((card) => {
			const suffix = card.blockId ? ` ^${card.blockId}` : '';
			const normalized = stripCheckboxPrefix(card.title).replace(/\r\n/g, '\n');
			const lines = normalized.split('\n');
			const firstLine = lines.shift() ?? '';
			output.push(`- [ ] ${firstLine}${suffix}`);
			lines.forEach((line) => {
				output.push(`  ${line}`);
			});
		});
	});

	const settingsFooter = serializeBoardSettingsFooter(board.settings);
	if (settingsFooter) {
		output.push(settingsFooter);
	}

	return output.join('\n').trimEnd() + '\n';
}
