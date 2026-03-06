import { toMinutes } from './model-utils';
import type { EventSegment } from './types';

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

export const deriveTimedDragStartState = (segment: EventSegment): TimedDragStartState => ({
	hoverDateKey: segment.start,
	hoverMinutes: toMinutes(segment.event.startTime) ?? 0,
	color: segment.event.color ?? null,
});

export const resolveTimedColor = (
	previewColor: string | null,
	segment: EventSegment | null,
	defaultEventColor: string,
) => previewColor ?? segment?.event.color ?? defaultEventColor;
