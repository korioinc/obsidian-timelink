import type { CalendarEvent, EditableEventResponse } from './types';
import type { App } from 'obsidian';

export type EventDayViewProps = {
	app: App;
	events: EditableEventResponse[];
	onOpenNote: (path: string) => void;
	onSaveEvent: (
		next: EditableEventResponse,
		previous: EditableEventResponse,
	) => Promise<void> | void;
	onDeleteEvent: (event: EditableEventResponse) => Promise<void> | void;
	onMoveEvent: (
		next: EditableEventResponse,
		previous: EditableEventResponse,
	) => Promise<void> | void;
	onCreateEvent: (event: CalendarEvent) => Promise<void> | void;
	initialDate?: Date;
	onDateChange?: (next: Date) => void;
};
