import type { EditableEventResponse, EventLocation } from './calendar';
import type { App } from 'obsidian';

export type CalendarEvent = {
	title: string;
	id?: string;
	allDay: boolean;
	color?: string;
	date?: string;
	endDate?: string | null;
	completed?: boolean;
	creator?: 'kanban' | 'calendar' | 'timeline';
	daysOfWeek?: Array<'U' | 'M' | 'T' | 'W' | 'R' | 'F' | 'S'>;
	startRecur?: string;
	endRecur?: string;
	startDate?: string;
	rrule?: string;
	skipDates?: string[];
	startTime?: string;
	endTime?: string | null;
	taskEvent?: boolean;
};

export type CalendarViewProps = {
	app: App;
	events: EditableEventResponse[];
	onOpenNote: (path: string) => void;
	onSaveEvent: (next: EditableEventResponse, previous: EditableEventResponse) => Promise<void> | void;
	onDeleteEvent: (event: EditableEventResponse) => Promise<void> | void;
	onMoveEvent: (next: EditableEventResponse, previous: EditableEventResponse) => Promise<void> | void;
	onCreateEvent: (event: CalendarEvent) => Promise<void> | void;
	initialDate?: Date;
	onDateChange?: (next: Date) => void;
};

export type MonthCalendarProps = CalendarViewProps;

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

export type CalendarHeaderView = {
	value: CalendarViewMode;
	label: string;
};

export type EventSegment = {
	id: string;
	event: CalendarEvent;
	location: EventLocation;
	start: string;
	end: string;
	span: number;
	startIndex: number;
	endIndex: number;
};

export type EventModalState = {
	segment: EventSegment;
	date: string;
	title: string;
	allDay: boolean;
	taskEvent: boolean;
	isCompleted: boolean;
	startTime: string;
	endTime: string;
	color: string;
};

export type CreateEventState = {
	title: string;
	startDate: string;
	endDate: string;
	allDay: boolean;
	taskEvent: boolean;
	startTime: string;
	endTime: string;
	isCompleted: boolean;
	color: string;
};

export type WeekDayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeekEventPlacementBase = {
	segment: EventSegment;
	weekRow: number;
	columnStart: number;
	spanInWeek: number;
	isSpanStart: boolean;
	isSpanEnd: boolean;
	isActualEnd: boolean;
};

export type WeekMultiDayPlacement = WeekEventPlacementBase;

export type WeekSingleDayPlacement = WeekEventPlacementBase & {
	dayOffset: WeekDayKey;
	cellIndex: number;
};

export type WeekEventLayout = {
	rowCapacity: number;
	weekRowCount: number;
	multiDayPlacements: WeekMultiDayPlacement[];
	singleDayPlacements: WeekSingleDayPlacement[];
	hiddenCountsByDay: Record<WeekDayKey, number>;
};

export type TimedEventPlacement = {
	segment: EventSegment;
	dayOffset: number;
	startMinutes: number;
	endMinutes: number;
	column: number;
	columnCount: number;
};

export type WeekHeaderProps = {
	weekCells: Array<{ date: Date }>;
	isToday: (date: Date) => boolean;
};

export type WeekAllDaySectionProps = {
	weekCells: { key: string; date: Date; inMonth: boolean }[];
	eventRows: EventSegment[][];
	anchorDateKey: string | null;
	isSelecting: boolean;
	draggingId: string | null;
	onDateClick: (dateKey: string) => void;
	onSelectionStart: (dateKey: string) => void;
	onSelectionHover: (dateKey: string) => void;
	onDragStart: (event: DragEvent, segment: EventSegment) => void;
	onDragEnd: () => void;
	onEventClick: (segment: EventSegment) => void;
	onResizeStart: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
	dragRange: { start: string; end: string } | null;
	resizeRange: { start: string; end: string } | null;
	dragHoverIndex: number | null;
	indexByDateKey: Map<string, number>;
	gridByIndex: { key: string; date: Date; inMonth: boolean }[];
	draggingColor?: string;
	resizingColor?: string;
	selectionSpan: { columnStart: number; span: number } | null;
	DEFAULT_EVENT_COLOR: string;
	normalizeEventColor: (color?: string | null) => string | null;
	onDragOverCapture: (event: DragEvent) => void;
	onDragEnterCapture: (event: DragEvent) => void;
	onDropCapture: (event: DragEvent) => void;
	gridRef: { current: HTMLDivElement | null };
};

export type WeekTimeGridProps = {
	weekCells: { date: Date }[];
	timedEvents: TimedEventPlacement[];
	isToday: (date: Date) => boolean;
	nowTop: number;
	todayIndex: number;
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

export type TimeSelectionState = {
	isSelecting: boolean;
	anchorDateKey: string | null;
	anchorMinutes: number | null;
	hoverDateKey: string | null;
	hoverMinutes: number | null;
};

export type TimeSelectionRange = {
	startDateKey: string;
	endDateKey: string;
	startMinutes: number;
	endMinutes: number;
};
