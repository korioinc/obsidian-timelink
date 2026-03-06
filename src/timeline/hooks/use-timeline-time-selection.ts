import { resolveSnappedMinutesFromY } from '../../shared/event/time-grid-interactions';
import type {
	CreateEventState,
	TimeSelectionRange,
	TimeSelectionState,
} from '../../shared/event/types';
import {
	buildTimedCreateModalFromRange,
	useTimeGridSelection,
} from '../../shared/hooks/use-time-grid-selection';
import { TIMELINE_SLOT_MINUTES } from '../constants';

type UseTimelineTimeSelectionParams = {
	dayKey: string;
	slotHeight: number;
	isSelectionBlocked: boolean;
	setCreateModal: (next: CreateEventState) => void;
};

type UseTimelineTimeSelectionResult = {
	timeSelection: TimeSelectionState;
	timeSelectionRange: TimeSelectionRange | null;
	endSelection: () => void;
	handleTimeGridPointerDown: (event: PointerEvent) => void;
	handleTimeGridPointerMove: (event: PointerEvent) => void;
};

export const useTimelineTimeSelection = ({
	dayKey,
	slotHeight,
	isSelectionBlocked,
	setCreateModal,
}: UseTimelineTimeSelectionParams): UseTimelineTimeSelectionResult =>
	useTimeGridSelection({
		stepMinutes: TIMELINE_SLOT_MINUTES,
		isSelectionBlocked,
		setCreateModal,
		resolvePointerInfo: (event) => {
			const target = event.currentTarget as HTMLDivElement | null;
			if (!target) return null;
			const minutes = resolveSnappedMinutesFromY(
				event.clientY,
				target.getBoundingClientRect().top,
				slotHeight,
				TIMELINE_SLOT_MINUTES,
			);
			return {
				target,
				dateKey: dayKey,
				minutes,
			};
		},
		buildCreateModalFromRange: (range) =>
			buildTimedCreateModalFromRange(range, { taskEvent: true }),
	});
