import { canMoveEvent } from '../../shared/event/event-sync';
import { deriveTimedPointerState } from '../../shared/event/time-grid-interactions';
import type { EditableEventResponse } from '../../shared/event/types';
import {
	type UseTimedGridEventInteractionsResult,
	useTimedGridEventInteractions,
} from '../../shared/hooks/use-timed-grid-event-interactions';
import { createDragImage } from '../services/interaction/drag';

type TimedEventChangeHandler = (
	next: EditableEventResponse,
	previous: EditableEventResponse,
) => Promise<void> | void;

type UseTimedEventInteractionsParams = {
	dateKeys: string[];
	slotHeight: number;
	slotMinutes: number;
	onSaveEvent: TimedEventChangeHandler;
	onMoveEvent: TimedEventChangeHandler;
	isResizingRef: { current: boolean };
	defaultEventColor: string;
};

type UseTimedEventInteractionsResult = UseTimedGridEventInteractionsResult;

export const useTimedEventInteractions = ({
	dateKeys,
	slotHeight,
	slotMinutes,
	onSaveEvent,
	onMoveEvent,
	isResizingRef,
	defaultEventColor,
}: UseTimedEventInteractionsParams): UseTimedEventInteractionsResult =>
	useTimedGridEventInteractions({
		defaultEventColor,
		isResizingRef,
		onSaveEvent,
		onMoveEvent,
		resolvePointerState: ({ clientX, clientY, gridElement }) =>
			deriveTimedPointerState({
				clientX,
				clientY,
				rect: gridElement.getBoundingClientRect(),
				dateKeys,
				slotHeight,
				slotMinutes,
			}),
		canDragSegment: (segment) => canMoveEvent(segment.event),
		onDragPreview: (event, segment) => {
			createDragImage(event, segment);
		},
		setResizeRefOnDragStart: true,
		clearResizeRefOnDragEnd: true,
	});
