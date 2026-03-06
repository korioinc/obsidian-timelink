import {
	addDays,
	formatDateKey,
	formatTime,
	MINUTES_IN_DAY,
	parseDateKey,
} from '../event/model-utils';
import {
	deriveTimeSelectionPointerState,
	normalizeTimeSelection,
} from '../event/time-grid-interactions';
import type { CreateEventState, TimeSelectionRange, TimeSelectionState } from '../event/types';
import {
	createPointerSelectionHandlers,
	type TimeSelectionPointerInfo,
} from './time-grid-selection-handlers';
import { useEffect, useMemo, useState } from 'preact/hooks';

type ResolveTimeSelectionPointerInfoParams = {
	event: PointerEvent;
	dateKeys: string[];
	slotHeight: number;
};

type UseTimeGridSelectionParams = {
	stepMinutes: number;
	isSelectionBlocked: boolean;
	setCreateModal: (next: CreateEventState) => void;
	resolvePointerInfo: (event: PointerEvent) => TimeSelectionPointerInfo | null;
	buildCreateModalFromRange: (range: TimeSelectionRange) => CreateEventState;
};

type UseTimeGridSelectionResult = {
	timeSelection: TimeSelectionState;
	timeSelectionRange: TimeSelectionRange | null;
	endSelection: () => void;
	handleTimeGridPointerDown: (event: PointerEvent) => void;
	handleTimeGridPointerMove: (event: PointerEvent) => void;
};

export const EMPTY_TIME_SELECTION: TimeSelectionState = {
	isSelecting: false,
	anchorDateKey: null,
	anchorMinutes: null,
	hoverDateKey: null,
	hoverMinutes: null,
};

type BuildTimedCreateModalOptions = {
	taskEvent?: boolean;
};

const normalizeCreateModalEndBoundary = (dateKey: string, minutes: number) => {
	const safeMinutes = Math.max(0, minutes);
	const dayOffset = Math.floor(safeMinutes / MINUTES_IN_DAY);
	const normalizedMinutes = safeMinutes - dayOffset * MINUTES_IN_DAY;
	return {
		dateKey: dayOffset === 0 ? dateKey : formatDateKey(addDays(parseDateKey(dateKey), dayOffset)),
		minutes: normalizedMinutes,
	};
};

export const buildTimedCreateModalFromRange = (
	range: TimeSelectionRange,
	options?: BuildTimedCreateModalOptions,
): CreateEventState => {
	const normalizedEnd = normalizeCreateModalEndBoundary(range.endDateKey, range.endMinutes);
	return {
		title: '',
		startDate: range.startDateKey,
		endDate: normalizedEnd.dateKey,
		allDay: false,
		taskEvent: options?.taskEvent ?? false,
		startTime: formatTime(range.startMinutes),
		endTime: formatTime(normalizedEnd.minutes),
		isCompleted: false,
		color: '',
	};
};

export const resolveTimeSelectionPointerInfo = ({
	event,
	dateKeys,
	slotHeight,
}: ResolveTimeSelectionPointerInfoParams): TimeSelectionPointerInfo | null => {
	const target = event.currentTarget as HTMLDivElement | null;
	if (!target) return null;
	const next = deriveTimeSelectionPointerState({
		clientX: event.clientX,
		clientY: event.clientY,
		rect: target.getBoundingClientRect(),
		dateKeys,
		slotHeight,
	});
	if (!next) return null;
	return { ...next, target };
};

export const useTimeGridSelection = ({
	stepMinutes,
	isSelectionBlocked,
	setCreateModal,
	resolvePointerInfo,
	buildCreateModalFromRange,
}: UseTimeGridSelectionParams): UseTimeGridSelectionResult => {
	const [timeSelection, setTimeSelection] = useState<TimeSelectionState>(EMPTY_TIME_SELECTION);

	const endSelection = () => {
		setTimeSelection(EMPTY_TIME_SELECTION);
	};

	useEffect(() => {
		if (!timeSelection.isSelecting) return;
		const handlePointerUp = () => {
			const range = normalizeTimeSelection(timeSelection, stepMinutes);
			if (range) {
				setCreateModal(buildCreateModalFromRange(range));
			}
			setTimeSelection(EMPTY_TIME_SELECTION);
		};
		window.addEventListener('pointerup', handlePointerUp, { once: true });
		return () => window.removeEventListener('pointerup', handlePointerUp);
	}, [buildCreateModalFromRange, setCreateModal, stepMinutes, timeSelection]);

	const { handleTimeGridPointerDown, handleTimeGridPointerMove } = createPointerSelectionHandlers({
		timeSelection,
		isSelectionBlocked,
		setTimeSelection,
		resolvePointerInfo,
	});

	const timeSelectionRange = useMemo(
		() => (timeSelection.isSelecting ? normalizeTimeSelection(timeSelection, stepMinutes) : null),
		[stepMinutes, timeSelection],
	);

	return {
		timeSelection,
		timeSelectionRange,
		endSelection,
		handleTimeGridPointerDown,
		handleTimeGridPointerMove,
	};
};
