import type { EditableEventResponse } from '../calendar';
import type { CalendarEvent, EventSegment } from '../types';
import { compareDateKey } from '../utils/month-calendar-utils';

export const createResizeEffectHandlers = (
	resizing: EventSegment | null,
	resizeHoverDateKey: string | null,
	getDateKeyFromPointer: (clientX: number, clientY: number) => string | null,
	setResizeHoverDateKey: (dateKey: string | null) => void,
	onSaveEvent: (
		next: EditableEventResponse,
		previous: EditableEventResponse,
	) => Promise<void> | void,
	setResizing: (segment: EventSegment | null) => void,
	isResizingRef: { current: boolean },
) => {
	if (!resizing) return null;

	const handlePointerMove = (event: PointerEvent) => {
		const dateKey = getDateKeyFromPointer(event.clientX, event.clientY);
		if (dateKey) {
			setResizeHoverDateKey(dateKey);
		}
	};

	const handlePointerUp = () => {
		const startKey = resizing.event.date ?? resizing.start;
		let endKey = resizeHoverDateKey ?? startKey;
		if (compareDateKey(endKey, startKey) < 0) {
			endKey = startKey;
		}
		const nextEvent: CalendarEvent = {
			...resizing.event,
			endDate: endKey === startKey ? undefined : endKey,
		};
		const previous: EditableEventResponse = [resizing.event, resizing.location];
		const next: EditableEventResponse = [nextEvent, resizing.location];
		void onSaveEvent(next, previous);
		setResizing(null);
		setResizeHoverDateKey(null);
		// Allow a following click to open the modal again after the resize completes.
		window.setTimeout(() => {
			isResizingRef.current = false;
		}, 0);
	};

	return { handlePointerMove, handlePointerUp };
};

export const handleResizeStartFactory = (
	setResizing: (segment: EventSegment) => void,
	setResizeHoverDateKey: (dateKey: string) => void,
) => {
	return (segment: EventSegment) => {
		setResizing(segment);
		setResizeHoverDateKey(segment.end);
	};
};
