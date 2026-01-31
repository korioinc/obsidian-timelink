import {
	KanbanBoardSettings,
	parseBoardSettingsFooter,
	serializeBoardSettingsFooter,
} from './board-settings';
import { KANBAN_FRONTMATTER_KEY, KANBAN_FRONTMATTER_VALUE } from './constants';

export interface KanbanCard {
	id: string;
	title: string;
	lineStart: number;
	blockId?: string;
}

export interface KanbanLane {
	id: string;
	title: string;
	lineStart: number;
	lineEnd: number;
	cards: KanbanCard[];
}

export interface KanbanBoard {
	lanes: KanbanLane[];
	settings: KanbanBoardSettings;
}

const headingPattern = /^##\s+(.*)$/;
const cardPattern = /^-\s+\[([ xX])\]\s+(.*)$/;
const blockIdPattern = /^(.*?)(?:\s+\^([A-Za-z0-9-]+))?$/;
const checkboxPatterns = [/^\[\s\]\s+/, /^\[[xX]\]\s+/];

export function isKanbanBoard(markdown: string): boolean {
	return markdown.includes(`${KANBAN_FRONTMATTER_KEY}: ${KANBAN_FRONTMATTER_VALUE}`);
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

function stripSettingsFooter(lines: string[]): string[] {
	let endIndex = -1;
	for (let i = lines.length - 1; i >= 0; i -= 1) {
		if (lines[i]?.trim() === '%%') {
			endIndex = i;
			break;
		}
	}
	if (endIndex === -1) return lines;

	let cursor = endIndex - 1;
	while (cursor >= 0 && lines[cursor]?.trim() === '') cursor -= 1;
	if (cursor < 0 || lines[cursor]?.trim() !== '```') return lines;
	const closingFence = cursor;

	let openingFence = -1;
	for (let i = closingFence - 1; i >= 0; i -= 1) {
		if (lines[i]?.trim() === '```') {
			openingFence = i;
			break;
		}
	}
	if (openingFence === -1) return lines;

	let sentinelIndex = openingFence - 1;
	while (sentinelIndex >= 0 && lines[sentinelIndex]?.trim() === '') sentinelIndex -= 1;
	if (sentinelIndex < 0 || lines[sentinelIndex]?.trim() !== '%% kanban:settings') return lines;

	return lines.slice(0, sentinelIndex);
}

export function serializeKanbanBoard(board: KanbanBoard, original: string): string {
	const lines = stripSettingsFooter(original.split('\n'));
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

export function moveCard(
	board: KanbanBoard,
	cardId: string,
	toLaneId: string,
	toIndex: number,
): KanbanBoard {
	let movingCard: KanbanCard | null = null;

	const lanes = board.lanes.map((lane) => {
		const cards = lane.cards.filter((card) => {
			if (card.id === cardId) {
				movingCard = card;
				return false;
			}
			return true;
		});
		return { ...lane, cards };
	});

	if (!movingCard) return board;
	const cardToMove = movingCard;

	return {
		lanes: lanes.map((lane) => {
			if (lane.id !== toLaneId) return lane;
			const nextCards = [...lane.cards];
			nextCards.splice(Math.max(0, Math.min(toIndex, nextCards.length)), 0, cardToMove);
			return { ...lane, cards: nextCards };
		}),
		settings: board.settings,
	};
}

export function addLane(board: KanbanBoard, title: string): KanbanBoard {
	const nextLane: KanbanLane = {
		id: `lane-${board.lanes.length}-${Date.now()}`,
		title: title.trim(),
		lineStart: 0,
		lineEnd: 0,
		cards: [],
	};
	return { lanes: [...board.lanes, nextLane], settings: board.settings };
}

export function updateLaneTitle(board: KanbanBoard, laneId: string, title: string): KanbanBoard {
	const trimmed = title.trim();
	if (!trimmed) return board;
	return {
		lanes: board.lanes.map((lane) => (lane.id === laneId ? { ...lane, title: trimmed } : lane)),
		settings: board.settings,
	};
}

export function removeLane(board: KanbanBoard, laneId: string): KanbanBoard {
	return { lanes: board.lanes.filter((lane) => lane.id !== laneId), settings: board.settings };
}

export function addCard(board: KanbanBoard, laneId: string, title: string): KanbanBoard {
	return {
		lanes: board.lanes.map((lane) => {
			if (lane.id !== laneId) return lane;
			const card: KanbanCard = {
				id: `card-${lane.cards.length}-${Date.now()}`,
				title,
				lineStart: lane.lineStart,
				blockId: undefined,
			};
			return { ...lane, cards: [...lane.cards, card] };
		}),
		settings: board.settings,
	};
}

export function removeCard(board: KanbanBoard, cardId: string): KanbanBoard {
	return {
		lanes: board.lanes.map((lane) => ({
			...lane,
			cards: lane.cards.filter((card) => card.id !== cardId),
		})),
		settings: board.settings,
	};
}

export function updateCardTitle(board: KanbanBoard, cardId: string, title: string): KanbanBoard {
	const normalized = title.replace(/\r\n/g, '\n');
	const trimmed = normalized.trim();
	if (!trimmed) return board;
	return {
		lanes: board.lanes.map((lane) => ({
			...lane,
			cards: lane.cards.map((card) =>
				card.id === cardId ? { ...card, title: trimmed, blockId: card.blockId } : card,
			),
		})),
		settings: board.settings,
	};
}

export function updateCardBlockId(
	board: KanbanBoard,
	cardId: string,
	blockId: string,
): KanbanBoard {
	const trimmed = blockId.trim();
	if (!trimmed) return board;
	return {
		lanes: board.lanes.map((lane) => ({
			...lane,
			cards: lane.cards.map((card) => (card.id === cardId ? { ...card, blockId: trimmed } : card)),
		})),
		settings: board.settings,
	};
}
