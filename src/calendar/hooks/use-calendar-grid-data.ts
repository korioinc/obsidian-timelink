import { formatDateKey } from '../../shared/event/model-utils';
import { getDateKeyFromPointer as getDateKeyFromPointerInGrid } from '../../shared/event/time-grid-interactions';
import { deriveGridByIndex, deriveIndexByDateKey } from '../services/interaction/grid';
import { buildWeekGrid, type DayCellData } from '../utils/date-grid';
import { useMemo, useRef } from 'preact/hooks';

export const buildDayGrid = (currentDate: Date): DayCellData[] => [
	{
		date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
		inMonth: true,
	},
];

export const deriveDateKeysFromGrid = (grid: DayCellData[]): string[] =>
	grid.map((cell) => formatDateKey(cell.date));

type UseCalendarGridDataParams = {
	currentDate: Date;
	view: 'day' | 'week';
	weekStartsOn?: number;
};

export const useCalendarGridData = ({
	currentDate,
	view,
	weekStartsOn = 0,
}: UseCalendarGridDataParams) => {
	const grid = useMemo(
		() => (view === 'day' ? buildDayGrid(currentDate) : buildWeekGrid(currentDate, weekStartsOn)),
		[currentDate, view, weekStartsOn],
	);
	const gridByIndex = useMemo(() => deriveGridByIndex(grid), [grid]);
	const indexByDateKey = useMemo(() => deriveIndexByDateKey(gridByIndex), [gridByIndex]);
	const dateKeys = useMemo(() => deriveDateKeysFromGrid(grid), [grid]);
	const gridRef = useRef<HTMLDivElement | null>(null);
	const getDateKeyFromPointer = (clientX: number, _clientY: number) => {
		if (view === 'day') {
			return dateKeys[0] ?? null;
		}
		const gridEl = gridRef.current;
		if (!gridEl) return null;
		return getDateKeyFromPointerInGrid(clientX, gridEl.getBoundingClientRect(), dateKeys);
	};

	return {
		grid,
		gridByIndex,
		indexByDateKey,
		dateKeys,
		gridRef,
		getDateKeyFromPointer,
	};
};
