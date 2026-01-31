export type DateKeyGridCell = { key: string };

export type GridRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

const clampIndex = (value: number, max: number) => {
	if (Number.isNaN(value)) return 0;
	return Math.min(Math.max(0, value), max);
};

export const getDateKeyFromPoint = (
	clientX: number,
	clientY: number,
	rect: GridRect,
	gridByIndex: DateKeyGridCell[],
): string | null => {
	if (!rect.width || !rect.height) return null;
	const colWidth = rect.width / 7;
	const rowHeight = rect.height / 6;
	const rawCol = Math.floor((clientX - rect.left) / colWidth);
	const rawRow = Math.floor((clientY - rect.top) / rowHeight);
	const col = clampIndex(rawCol, 6);
	const row = clampIndex(rawRow, 5);
	const index = row * 7 + col;
	return gridByIndex[index]?.key ?? null;
};
