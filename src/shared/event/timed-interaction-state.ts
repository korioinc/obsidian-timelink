import { toMinutes } from './model-utils';
import { resolveTimedDragHoverState } from './time-grid-interactions';
import type { EventSegment, TimedDragAnchor } from './types';

type TimedResizeStartState = {
	hoverDateKey: string;
	hoverMinutes: number | null;
	color: string | null;
};

type TimedDragStartState = {
	hoverDateKey: string;
	hoverMinutes: number;
	color: string | null;
};

export const deriveTimedResizeStartState = (segment: EventSegment): TimedResizeStartState => ({
	hoverDateKey: segment.end,
	hoverMinutes: toMinutes(segment.event.endTime) ?? null,
	color: segment.event.color ?? null,
});

export const deriveTimedDragStartState = (
	segment: EventSegment,
	dragAnchor?: TimedDragAnchor | null,
): TimedDragStartState => {
	const baseState = dragAnchor
		? resolveTimedDragHoverState(segment, dragAnchor.dateKey, dragAnchor.startMinutes, dragAnchor)
		: {
				dateKey: segment.start,
				minutes: toMinutes(segment.event.startTime) ?? 0,
			};
	return {
		hoverDateKey: baseState.dateKey,
		hoverMinutes: baseState.minutes,
		color: segment.event.color ?? null,
	};
};

export const resolveTimedColor = (
	previewColor: string | null,
	segment: EventSegment | null,
	defaultEventColor: string,
) => previewColor ?? segment?.event.color ?? defaultEventColor;
