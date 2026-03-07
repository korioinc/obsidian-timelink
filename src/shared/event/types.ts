export type EventLocation = {
	file: { path: string };
	lineNumber: number | undefined;
};

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

export type EditableEventResponse = [CalendarEvent, EventLocation];

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

export type TimedEventPlacement = {
	segment: EventSegment;
	dayOffset: number;
	startMinutes: number;
	endMinutes: number;
	column: number;
	columnCount: number;
};

export type TimedDragAnchor = {
	dateKey: string;
	startMinutes: number;
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
