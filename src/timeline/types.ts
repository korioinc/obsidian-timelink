import type { EventServiceCalendar } from '../shared/event/event-service';
import type {
	EditableEventResponse,
	EventSegment,
	TimeSelectionRange,
	TimedEventPlacement,
} from '../shared/event/types';
import type { EventDayViewProps } from '../shared/event/view-types';
import type { App } from 'obsidian';

type TimelineCalendar = EventServiceCalendar & {
	getDirectory: () => string;
};

export type TimelineUIProps = {
	app: App;
	calendar: TimelineCalendar;
	onOpenNote: (path: string) => Promise<void> | void;
};

export type TimelineDayViewProps = Omit<EventDayViewProps, 'initialDate' | 'onDateChange'> & {
	currentDate: Date;
};

export type TimelineEventChangeHandler = (
	next: EditableEventResponse,
	previous: EditableEventResponse,
) => Promise<void> | void;

export type TimelineDayModel = {
	dayCell: { date: Date; inMonth: true };
	dayKey: string;
	eventSegments: EventSegment[];
	unscheduledTasks: EventSegment[];
};

export type BuildTimelineTimedVisualModelParams = {
	eventSegments: EventSegment[];
	dayKey: string;
	dayDate: Date;
	timedResizing: EventSegment | null;
	timedResizeRange: TimeSelectionRange | null;
	timedDragging: EventSegment | null;
	timedDragRange: TimeSelectionRange | null;
	now: Date;
	slotMinutes: number;
	slotHeight: number;
};

export type TimelineTimedVisualModel = {
	timedEventsForDay: TimedEventPlacement[];
	showNowIndicator: boolean;
	nowTop: number;
};
