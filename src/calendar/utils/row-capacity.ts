export const getGridRowCapacity = (
	gridHeight: number | null,
	rowCount: number,
	multiDayTopOffset: number,
	eventRowSpacing: number,
): number => {
	if (!gridHeight) return 0;
	const rowHeight = gridHeight / rowCount;
	const available = Math.floor((rowHeight - multiDayTopOffset) / eventRowSpacing);
	return Math.max(0, available);
};
