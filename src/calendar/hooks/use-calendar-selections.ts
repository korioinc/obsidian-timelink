import {
	buildTimedCreateModalFromRange,
	resolveTimeSelectionPointerInfo,
	useTimeGridSelection,
} from '../../shared/hooks/use-time-grid-selection';
import { SLOT_MINUTES } from '../constants';
import { deriveSelectionRange } from '../services/interaction/derivers';
import {
	createSelectionHandlers,
	createSelectionPointerUpHandler,
	EMPTY_SELECTION,
	isSelectionActive,
} from '../services/interaction/selection';
import type { CreateEventState } from '../types';
import { useEffect, useMemo, useState } from 'preact/hooks';

type UseCalendarSelectionsParams = {
	indexByDateKey: Map<string, number>;
	dateKeys: string[];
	slotHeight: number;
	setCreateModal: (next: CreateEventState) => void;
	isSelectionBlocked: boolean;
};

export const useCalendarSelections = ({
	indexByDateKey,
	dateKeys,
	slotHeight,
	setCreateModal,
	isSelectionBlocked,
}: UseCalendarSelectionsParams) => {
	const [selection, setSelection] = useState(() => EMPTY_SELECTION);
	const { beginSelection, updateSelection, endSelection } = createSelectionHandlers(setSelection);
	const isSelecting = useMemo(() => isSelectionActive(selection), [selection]);

	useEffect(() => {
		if (!isSelecting) return;
		const handlePointerUp = createSelectionPointerUpHandler(
			() => selection,
			setCreateModal,
			endSelection,
		);
		window.addEventListener('pointerup', handlePointerUp);
		return () => window.removeEventListener('pointerup', handlePointerUp);
	}, [endSelection, isSelecting, selection, setCreateModal]);

	const {
		timeSelection,
		timeSelectionRange,
		handleTimeGridPointerDown,
		handleTimeGridPointerMove,
	} = useTimeGridSelection({
		stepMinutes: SLOT_MINUTES,
		isSelectionBlocked,
		setCreateModal,
		resolvePointerInfo: (event) =>
			resolveTimeSelectionPointerInfo({
				event,
				dateKeys,
				slotHeight,
			}),
		buildCreateModalFromRange: (range) =>
			buildTimedCreateModalFromRange(range, { taskEvent: false }),
	});

	const selectionRange = useMemo(
		() => deriveSelectionRange(selection, indexByDateKey),
		[selection, indexByDateKey],
	);

	return {
		selection,
		selectionRange,
		timeSelection,
		timeSelectionRange,
		beginSelection,
		updateSelection,
		endSelection,
		handleTimeGridPointerDown,
		handleTimeGridPointerMove,
	};
};
