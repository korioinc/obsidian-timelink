import type { DateKeyGridCell, GridRect } from '../../../shared/event/time-grid-interactions';
import { getDateKeyFromPoint } from '../../../shared/event/time-grid-interactions';

export const getDateKeyFromPointerFactory = (
	dayGridRef: { current: HTMLDivElement | null },
	gridByIndex: DateKeyGridCell[],
) => {
	return (clientX: number, clientY: number) => {
		const gridEl = dayGridRef.current;
		if (!gridEl) return null;
		const rect = gridEl.getBoundingClientRect();
		const gridRect: GridRect = {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height,
		};
		return getDateKeyFromPoint(clientX, clientY, gridRect, gridByIndex);
	};
};
