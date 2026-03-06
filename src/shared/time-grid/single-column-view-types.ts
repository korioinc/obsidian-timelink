import type { EventSegment, TimeSelectionRange, TimedEventPlacement } from '../event/types';

export type SingleColumnTimedViewProps = {
	date: Date;
	timedEvents: TimedEventPlacement[];
	isToday: (date: Date) => boolean;
	nowTop: number;
	showNowIndicator: boolean;
	onEventClick: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
	formatDateKey: (date: Date) => string;
	formatTime: (minutes: number) => string;
	DEFAULT_EVENT_COLOR: string;
	SLOT_HEIGHT: number;
	SLOT_MINUTES: number;
	timeGridHeight: string;
	selectionRange: TimeSelectionRange | null;
	onTimeGridPointerDown: (event: PointerEvent) => void;
	onTimeGridPointerMove: (event: PointerEvent) => void;
	onTimedResizeStart: (segment: EventSegment, event: PointerEvent) => void;
	timedResizingId?: string | null;
	timedDraggingId?: string | null;
	onTimedEventDragStart: (event: DragEvent, segment: EventSegment) => void;
	onTimedEventDragEnd: () => void;
	onTimedEventDragOver: (event: DragEvent) => void;
	onTimedEventDrop: (event: DragEvent) => void;
	timeGridRef: { current: HTMLDivElement | null };
	timedResizeRange: TimeSelectionRange | null;
	timedResizeColor?: string;
	timedDragRange: TimeSelectionRange | null;
	timedDragColor?: string;
	normalizeEventColor: (color?: string | null) => string | null;
};

export type SingleColumnTimedGridModel = {
	date: Date;
	timedEvents: TimedEventPlacement[];
	isToday: (date: Date) => boolean;
	nowTop: number;
	showNowIndicator: boolean;
	formatDateKey: (date: Date) => string;
	formatTime: (minutes: number) => string;
	timeGridHeight: string;
	slotHeight: number;
	slotMinutes: number;
};

type SingleColumnTimedGridEventHandlers = {
	onEventClick: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
	onTimedResizeStart: (segment: EventSegment, event: PointerEvent) => void;
	onTimedEventDragStart: (event: DragEvent, segment: EventSegment) => void;
	onTimedEventDragEnd: () => void;
};

type SingleColumnTimedGridInteractionHandlers = {
	onTimeGridPointerDown: (event: PointerEvent) => void;
	onTimeGridPointerMove: (event: PointerEvent) => void;
	onTimedEventDragOver: (event: DragEvent) => void;
	onTimedEventDrop: (event: DragEvent) => void;
	timeGridRef: { current: HTMLDivElement | null };
};

type SingleColumnTimedGridOverlayState = {
	selectionRange: TimeSelectionRange | null;
	timedResizeRange: TimeSelectionRange | null;
	timedResizeColor?: string;
	timedDragRange: TimeSelectionRange | null;
	timedDragColor?: string;
	timedResizingId?: string | null;
	timedDraggingId?: string | null;
};

type SingleColumnTimedGridAppearance = {
	defaultEventColor: string;
	normalizeEventColor: (color?: string | null) => string | null;
};

export type SingleColumnTimedGridState = {
	model: SingleColumnTimedGridModel;
	eventHandlers: SingleColumnTimedGridEventHandlers;
	interactionHandlers: SingleColumnTimedGridInteractionHandlers;
	overlayState: SingleColumnTimedGridOverlayState;
	appearance: SingleColumnTimedGridAppearance;
};

export const buildSingleColumnTimedGridState = (
	view: SingleColumnTimedViewProps,
): SingleColumnTimedGridState => ({
	model: {
		date: view.date,
		timedEvents: view.timedEvents,
		isToday: view.isToday,
		nowTop: view.nowTop,
		showNowIndicator: view.showNowIndicator,
		formatDateKey: view.formatDateKey,
		formatTime: view.formatTime,
		timeGridHeight: view.timeGridHeight,
		slotHeight: view.SLOT_HEIGHT,
		slotMinutes: view.SLOT_MINUTES,
	},
	eventHandlers: {
		onEventClick: view.onEventClick,
		onToggleCompleted: view.onToggleCompleted,
		onTimedResizeStart: view.onTimedResizeStart,
		onTimedEventDragStart: view.onTimedEventDragStart,
		onTimedEventDragEnd: view.onTimedEventDragEnd,
	},
	interactionHandlers: {
		onTimeGridPointerDown: view.onTimeGridPointerDown,
		onTimeGridPointerMove: view.onTimeGridPointerMove,
		onTimedEventDragOver: view.onTimedEventDragOver,
		onTimedEventDrop: view.onTimedEventDrop,
		timeGridRef: view.timeGridRef,
	},
	overlayState: {
		selectionRange: view.selectionRange,
		timedResizeRange: view.timedResizeRange,
		timedResizeColor: view.timedResizeColor,
		timedDragRange: view.timedDragRange,
		timedDragColor: view.timedDragColor,
		timedResizingId: view.timedResizingId,
		timedDraggingId: view.timedDraggingId,
	},
	appearance: {
		defaultEventColor: view.DEFAULT_EVENT_COLOR,
		normalizeEventColor: view.normalizeEventColor,
	},
});
