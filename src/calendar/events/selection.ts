import type { CreateEventState } from '../types';
import { normalizeRange } from '../utils/month-calendar-utils';

export type SelectionState = {
	isSelecting: boolean;
	anchorDateKey: string | null;
	hoverDateKey: string | null;
	startDateKey: string | null;
	endDateKey: string | null;
};

export const EMPTY_SELECTION: SelectionState = {
	isSelecting: false,
	anchorDateKey: null,
	hoverDateKey: null,
	startDateKey: null,
	endDateKey: null,
};

const EMPTY_CREATE_MODAL: CreateEventState = {
	title: '',
	startDate: '',
	endDate: '',
	allDay: true,
	taskEvent: false,
	startTime: '',
	endTime: '',
	isCompleted: false,
	color: '',
};

export const createSelectionHandlers = (
	setSelection: (next: SelectionState | ((prev: SelectionState) => SelectionState)) => void,
) => {
	const beginSelection = (dateKey: string) => {
		setSelection({
			isSelecting: true,
			anchorDateKey: dateKey,
			hoverDateKey: dateKey,
			startDateKey: dateKey,
			endDateKey: dateKey,
		});
	};

	const updateSelection = (dateKey: string) => {
		setSelection((prev) => {
			if (!prev.isSelecting || !prev.anchorDateKey) return prev;
			const { start, end } = normalizeRange(prev.anchorDateKey, dateKey);
			return { ...prev, hoverDateKey: dateKey, startDateKey: start, endDateKey: end };
		});
	};

	const endSelection = () => {
		setSelection(EMPTY_SELECTION);
	};

	return { beginSelection, updateSelection, endSelection };
};

export const isSelectionActive = (selection: SelectionState) =>
	selection.isSelecting && Boolean(selection.anchorDateKey);

export const createSelectionPointerUpHandler = (
	getSelection: () => SelectionState,
	setCreateModal: (next: CreateEventState) => void,
	endSelection: () => void,
) => {
	return () => {
		const selection = getSelection();
		if (selection.startDateKey) {
			const startDate = selection.startDateKey;
			const endDate = selection.endDateKey;
			setCreateModal({
				...EMPTY_CREATE_MODAL,
				startDate,
				endDate: startDate === endDate ? '' : (endDate ?? ''),
			});
		}
		endSelection();
	};
};
