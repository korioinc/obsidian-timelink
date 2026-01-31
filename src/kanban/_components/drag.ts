export type LaneDragData = {
	type: 'lane';
	laneId: string;
};

export type CardDragData = {
	type: 'card';
	cardId: string;
	fromLaneId: string;
	fromIndex: number;
};

export type DragData = LaneDragData | CardDragData;

export function isLaneDragData(data: Record<string, unknown>): data is LaneDragData {
	return data.type === 'lane' && typeof data.laneId === 'string';
}

export function isCardDragData(data: Record<string, unknown>): data is CardDragData {
	return (
		data.type === 'card' &&
		typeof data.cardId === 'string' &&
		typeof data.fromLaneId === 'string' &&
		typeof data.fromIndex === 'number'
	);
}

export function readLaneOrder(container: HTMLElement): string[] {
	return Array.from(container.children)
		.map((child) => (child as HTMLElement).dataset.laneId)
		.filter((id): id is string => Boolean(id));
}

export function readCardOrder(container: HTMLElement): string[] {
	return Array.from(container.children)
		.map((child) => (child as HTMLElement).dataset.cardId)
		.filter((id): id is string => Boolean(id));
}
