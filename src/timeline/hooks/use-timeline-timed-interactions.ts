import {
	resolveSnappedMinutesFromPointer,
	resolveSnappedMinutesFromY,
} from '../../shared/event/time-grid-interactions';
import type { EditableEventResponse } from '../../shared/event/types';
import {
	buildDefaultResizeCommitEntries,
	type UseTimedGridEventInteractionsResult,
	useTimedGridEventInteractions,
} from '../../shared/hooks/use-timed-grid-event-interactions';
import { TIMELINE_SLOT_MINUTES } from '../constants';
import type { TimelineEventChangeHandler } from '../types';

type UseTimelineTimedInteractionsParams = {
	dayKey: string;
	slotHeight: number;
	onSaveEvent: TimelineEventChangeHandler;
	onMoveEvent: TimelineEventChangeHandler;
	isResizingRef: { current: boolean };
	defaultEventColor: string;
};

type UseTimelineTimedInteractionsResult = UseTimedGridEventInteractionsResult;

export const hasTimelineResizeChange = (
	next: EditableEventResponse,
	previous: EditableEventResponse,
): boolean => {
	const [nextEvent] = next;
	const [previousEvent] = previous;
	const normalizeEndDate = (event: { date?: string; endDate?: string | null }) => {
		const date = event.date ?? undefined;
		const endDate = event.endDate ?? undefined;
		return endDate === date ? undefined : endDate;
	};
	return (
		nextEvent.startTime !== previousEvent.startTime ||
		nextEvent.endTime !== previousEvent.endTime ||
		normalizeEndDate(nextEvent) !== normalizeEndDate(previousEvent)
	);
};

export const useTimelineTimedInteractions = ({
	dayKey,
	slotHeight,
	onSaveEvent,
	onMoveEvent,
	isResizingRef,
	defaultEventColor,
}: UseTimelineTimedInteractionsParams): UseTimelineTimedInteractionsResult =>
	useTimedGridEventInteractions({
		defaultEventColor,
		isResizingRef,
		onSaveEvent,
		onMoveEvent,
		resolvePointerState: ({ clientY, gridElement }) => ({
			dateKey: dayKey,
			minutes: resolveSnappedMinutesFromPointer(
				clientY,
				gridElement.getBoundingClientRect(),
				slotHeight,
				TIMELINE_SLOT_MINUTES,
			),
		}),
		resolveDragOverState: ({ event, gridElement }) => ({
			dateKey: dayKey,
			minutes: resolveSnappedMinutesFromY(
				event.clientY,
				gridElement.getBoundingClientRect().top,
				slotHeight,
				TIMELINE_SLOT_MINUTES,
			),
		}),
		onDragStart: (event, segment) => {
			event.dataTransfer?.setData('text/plain', segment.id);
		},
		buildResizeCommitEntries: (segment, hoverDateKey, hoverMinutes) =>
			buildDefaultResizeCommitEntries(segment, hoverDateKey, hoverMinutes),
		shouldCommitResize: (entries) => hasTimelineResizeChange(entries.next, entries.previous),
		clearDragStateAfterDrop: true,
	});
