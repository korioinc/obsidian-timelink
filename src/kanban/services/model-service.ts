import type { KanbanBoard, KanbanCard, KanbanLane } from '../types';

function buildCardId(lane: KanbanLane): string {
	return `card-${lane.cards.length}-${Date.now()}`;
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

export function insertCardAt(
	board: KanbanBoard,
	laneId: string,
	index: number,
	card: Pick<KanbanCard, 'title' | 'blockId'>,
): KanbanBoard {
	const normalizedTitle = card.title.replace(/\r\n/g, '\n').trim();
	if (!normalizedTitle) return board;
	const normalizedBlockId = card.blockId?.trim() || undefined;
	return {
		lanes: board.lanes.map((lane) => {
			if (lane.id !== laneId) return lane;
			const nextCards = [...lane.cards];
			const nextCard: KanbanCard = {
				id: buildCardId(lane),
				title: normalizedTitle,
				lineStart: lane.lineStart,
				blockId: normalizedBlockId,
			};
			const clampedIndex = Math.max(0, Math.min(index, nextCards.length));
			nextCards.splice(clampedIndex, 0, nextCard);
			return { ...lane, cards: nextCards };
		}),
		settings: board.settings,
	};
}

export function addCard(board: KanbanBoard, laneId: string, title: string): KanbanBoard {
	return {
		lanes: board.lanes.map((lane) => {
			if (lane.id !== laneId) return lane;
			const card: KanbanCard = {
				id: buildCardId(lane),
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

export function reorderLanesByOrder(board: KanbanBoard, order: string[]): KanbanBoard {
	const laneMap = new Map(board.lanes.map((lane) => [lane.id, lane]));
	const nextLanes = order
		.map((id) => laneMap.get(id))
		.filter((lane): lane is KanbanBoard['lanes'][number] => Boolean(lane));
	const missingLanes = board.lanes.filter((lane) => !order.includes(lane.id));
	return { lanes: [...nextLanes, ...missingLanes], settings: board.settings };
}

export function generateBlockId(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let next = '';
	for (let i = 0; i < 6; i += 1) {
		next += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return next;
}

export function findCardById(board: KanbanBoard, cardId: string): KanbanCard | null {
	for (const lane of board.lanes) {
		const card = lane.cards.find((item) => item.id === cardId);
		if (card) return card;
	}
	return null;
}

export function findCardBlockId(board: KanbanBoard, cardId: string): string | null {
	const card = findCardById(board, cardId);
	return card?.blockId ?? null;
}

export function hasCard(board: KanbanBoard, cardId: string): boolean {
	return findCardById(board, cardId) !== null;
}

export function buildCardTitleMap(board: KanbanBoard | null): Map<string, string> {
	return new Map(
		board?.lanes.flatMap((lane) => lane.cards.map((card) => [card.id, card.title])) ?? [],
	);
}

export function buildCardEventMap(
	board: KanbanBoard | null,
	hasLinkedEvent: (title: string) => boolean,
): Map<string, boolean> {
	return new Map(
		board?.lanes.flatMap((lane) =>
			lane.cards.map((card) => [card.id, hasLinkedEvent(card.title)] as const),
		) ?? [],
	);
}
