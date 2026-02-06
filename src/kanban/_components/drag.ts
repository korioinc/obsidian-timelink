export type LaneDragData = {
	type: 'lane';
	laneId: string;
};

export function isLaneDragData(data: Record<string, unknown>): data is LaneDragData {
	return data.type === 'lane' && typeof data.laneId === 'string';
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
