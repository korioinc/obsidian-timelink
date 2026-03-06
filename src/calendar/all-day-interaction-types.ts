import type { EventSegment } from '../shared/event/types';

export type AllDayEventInteractionHandlers = {
	onDateClick: (dateKey: string) => void;
	onSelectionStart: (dateKey: string) => void;
	onSelectionHover: (dateKey: string) => void;
	onDragStart: (event: DragEvent, segment: EventSegment) => void;
	onDragEnd: () => void;
	onEventClick: (segment: EventSegment) => void;
	onResizeStart: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
};

export type AllDayEventBarInteractionHandlers = Pick<
	AllDayEventInteractionHandlers,
	'onDragStart' | 'onDragEnd' | 'onEventClick' | 'onResizeStart' | 'onToggleCompleted'
>;
