import type { DragLocation } from '@atlaskit/pragmatic-drag-and-drop/types';

export type CrossBoardCardMovePayload = {
	sourceBoardPath: string;
	cardId: string;
	fromLaneId: string;
	fromIndex: number;
	title: string;
	blockId?: string;
};

type ActiveCardDrag = CrossBoardCardMovePayload & {
	handled: boolean;
};

const CARD_REORDER_HYSTERESIS_PX = 6;
const INTERNAL_CARD_DRAG_MIME = 'application/x-timelink-card';
const INTERNAL_CARD_DRAG_TEXT_PREFIX = 'timelink-card:';
let activeCardDrag: ActiveCardDrag | null = null;

export function readOrderByDataAttr(container: HTMLElement, dataKey: string): string[] {
	return Array.from(container.children)
		.map((child) => (child as HTMLElement).dataset[dataKey])
		.filter((id): id is string => Boolean(id));
}

export function parseCardDragPayload(
	dataTransfer: DataTransfer | null,
): CrossBoardCardMovePayload | null {
	if (!dataTransfer) return null;
	const raw =
		dataTransfer.getData(INTERNAL_CARD_DRAG_MIME) ||
		(() => {
			const fallback = dataTransfer.getData('text/plain');
			if (!fallback.startsWith(INTERNAL_CARD_DRAG_TEXT_PREFIX)) return '';
			return fallback.slice(INTERNAL_CARD_DRAG_TEXT_PREFIX.length);
		})();
	if (!raw) {
		if (!activeCardDrag) return null;
		return {
			sourceBoardPath: activeCardDrag.sourceBoardPath,
			cardId: activeCardDrag.cardId,
			fromLaneId: activeCardDrag.fromLaneId,
			fromIndex: activeCardDrag.fromIndex,
			title: activeCardDrag.title,
			blockId: activeCardDrag.blockId,
		};
	}
	try {
		const parsed = JSON.parse(raw) as Partial<CrossBoardCardMovePayload>;
		if (
			typeof parsed.sourceBoardPath === 'string' &&
			typeof parsed.cardId === 'string' &&
			typeof parsed.fromLaneId === 'string' &&
			typeof parsed.fromIndex === 'number' &&
			typeof parsed.title === 'string'
		) {
			return {
				sourceBoardPath: parsed.sourceBoardPath,
				cardId: parsed.cardId,
				fromLaneId: parsed.fromLaneId,
				fromIndex: parsed.fromIndex,
				title: parsed.title,
				blockId: typeof parsed.blockId === 'string' ? parsed.blockId : undefined,
			};
		}
		return null;
	} catch {
		return null;
	}
}

export function setActiveCardDrag(payload: CrossBoardCardMovePayload): void {
	activeCardDrag = { ...payload, handled: false };
}

export function getActiveCardDrag(): (CrossBoardCardMovePayload & { handled: boolean }) | null {
	return activeCardDrag;
}

export function clearActiveCardDrag(): void {
	activeCardDrag = null;
}

export function markActiveCardDragHandled(payload: CrossBoardCardMovePayload): void {
	if (
		activeCardDrag &&
		activeCardDrag.sourceBoardPath === payload.sourceBoardPath &&
		activeCardDrag.cardId === payload.cardId &&
		activeCardDrag.fromLaneId === payload.fromLaneId
	) {
		activeCardDrag.handled = true;
	}
}

export function writeCardDragPayload(
	dataTransfer: DataTransfer,
	payload: CrossBoardCardMovePayload,
): void {
	const serialized = JSON.stringify(payload);
	dataTransfer.setData(INTERNAL_CARD_DRAG_MIME, serialized);
	dataTransfer.setData('text/plain', `${INTERNAL_CARD_DRAG_TEXT_PREFIX}${serialized}`);
	dataTransfer.effectAllowed = 'copyMove';
}

export function isActiveDropTarget(
	element: HTMLElement,
	targets: DragLocation['dropTargets'],
): boolean {
	return targets.some((record) => record.element === element);
}

export function moveDraggedCardByPointer(
	listEl: HTMLUListElement,
	draggedEl: HTMLLIElement,
	pointerY: number,
): void {
	let previous = draggedEl.previousElementSibling as HTMLLIElement | null;
	while (previous) {
		const rect = previous.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		if (pointerY >= midpoint - CARD_REORDER_HYSTERESIS_PX) break;
		listEl.insertBefore(draggedEl, previous);
		previous = draggedEl.previousElementSibling as HTMLLIElement | null;
	}
	let next = draggedEl.nextElementSibling as HTMLLIElement | null;
	while (next) {
		const rect = next.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		if (pointerY <= midpoint + CARD_REORDER_HYSTERESIS_PX) break;
		listEl.insertBefore(next, draggedEl);
		next = draggedEl.nextElementSibling as HTMLLIElement | null;
	}
}

export function getDropIndexFromPointer(listEl: HTMLUListElement, y: number): number {
	const cards = Array.from(listEl.querySelectorAll<HTMLLIElement>('li[data-card-id]'));
	for (const [i, cardEl] of cards.entries()) {
		const rect = cardEl.getBoundingClientRect();
		if (y < rect.top + rect.height / 2) return i;
	}
	return cards.length;
}

export function restoreOrder(
	container: HTMLElement,
	order: string[],
	dataAttr: string,
	lookupRoot: ParentNode = container,
): void {
	const doc = container.ownerDocument;
	const fragment = doc.createDocumentFragment();
	const elementById = new Map<string, HTMLElement>();
	lookupRoot.querySelectorAll<HTMLElement>(`[${dataAttr}]`).forEach((element) => {
		const id = element.getAttribute(dataAttr);
		if (!id) return;
		elementById.set(id, element);
	});
	order.forEach((id) => {
		const element = elementById.get(id);
		if (element) {
			fragment.appendChild(element);
		}
	});
	container.appendChild(fragment);
}

export function readCardOrderForList(container: HTMLElement): string[] {
	return readOrderByDataAttr(container, 'cardId');
}
