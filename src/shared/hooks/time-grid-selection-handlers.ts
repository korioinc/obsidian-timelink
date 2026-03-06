import type { TimeSelectionState } from '../event/types';

export type TimeSelectionPointerInfo = {
	target: HTMLDivElement;
	dateKey: string;
	minutes: number;
};

type SetTimeSelection = (
	next: TimeSelectionState | ((prev: TimeSelectionState) => TimeSelectionState),
) => void;

type CreatePointerSelectionHandlersParams = {
	timeSelection: TimeSelectionState;
	isSelectionBlocked: boolean;
	setTimeSelection: SetTimeSelection;
	resolvePointerInfo: (event: PointerEvent) => TimeSelectionPointerInfo | null;
};

export const deriveTimeSelectionStartState = (
	dateKey: string,
	minutes: number,
): TimeSelectionState => ({
	isSelecting: true,
	anchorDateKey: dateKey,
	anchorMinutes: minutes,
	hoverDateKey: dateKey,
	hoverMinutes: minutes,
});

export const patchTimeSelectionHover = (
	prev: TimeSelectionState,
	dateKey: string,
	minutes: number,
): TimeSelectionState => ({
	...prev,
	hoverDateKey: dateKey,
	hoverMinutes: minutes,
});

export const createPointerSelectionHandlers = ({
	timeSelection,
	isSelectionBlocked,
	setTimeSelection,
	resolvePointerInfo,
}: CreatePointerSelectionHandlersParams) => {
	const handleTimeGridPointerDown = (event: PointerEvent) => {
		if (event.button !== 0 || isSelectionBlocked) return;
		const pointerInfo = resolvePointerInfo(event);
		if (!pointerInfo) return;
		pointerInfo.target.setPointerCapture(event.pointerId);
		setTimeSelection(deriveTimeSelectionStartState(pointerInfo.dateKey, pointerInfo.minutes));
	};

	const handleTimeGridPointerMove = (event: PointerEvent) => {
		if (!timeSelection.isSelecting || !timeSelection.anchorDateKey) return;
		const pointerInfo = resolvePointerInfo(event);
		if (!pointerInfo) return;
		setTimeSelection((prev) =>
			patchTimeSelectionHover(prev, pointerInfo.dateKey, pointerInfo.minutes),
		);
	};

	return { handleTimeGridPointerDown, handleTimeGridPointerMove };
};
