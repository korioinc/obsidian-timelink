import { resolveEffectiveTimedEventRange, toMinutes } from './model-utils';
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

const resolveTimedResizeEndBoundary = (segment: EventSegment) => {
	const range = resolveEffectiveTimedEventRange(segment.event);
	return {
		dateKey: range && range.endKey !== range.startKey ? range.endKey : segment.end,
		minutes: range?.endMinutes ?? toMinutes(segment.event.endTime) ?? null,
	};
};

export const deriveTimedResizeStartState = (segment: EventSegment): TimedResizeStartState => {
	const endBoundary = resolveTimedResizeEndBoundary(segment);
	return {
		hoverDateKey: endBoundary.dateKey,
		hoverMinutes: endBoundary.minutes,
		color: segment.event.color ?? null,
	};
};

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
