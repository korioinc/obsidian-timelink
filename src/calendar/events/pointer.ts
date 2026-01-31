import { type GridRect, getDateKeyFromPoint } from '../utils/drag-drop';

export const getDateKeyFromPointerFactory = (
	dayGridRef: { current: HTMLDivElement | null },
	gridByIndex: Array<{ key: string }>,
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
