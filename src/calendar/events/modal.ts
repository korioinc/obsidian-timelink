import type { EditableEventResponse } from '../calendar';
import type { CalendarEvent, CreateEventState, EventModalState, EventSegment } from '../types';
import { normalizeHexColor } from '../utils/month-calendar-utils';

export const handleToggleCompletedFactory = (
	onSaveEvent: (next: EditableEventResponse, previous: EditableEventResponse) => Promise<void> | void,
) => {
	return (segment: EventSegment) => {
		if (!segment.event.taskEvent) return;
		const previous: EditableEventResponse = [segment.event, segment.location];
		const nextEvent: CalendarEvent = {
			...segment.event,
			completed: !segment.event.completed,
		};
		const next: EditableEventResponse = [nextEvent, segment.location];
		void onSaveEvent(next, previous);
	};
};

export const handleEventClickFactory = (
	setModal: (next: EventModalState) => void,
	endSelection: () => void,
	isSelecting: () => boolean,
	isResizingRef: { current: boolean },
) => {
	return (segment: EventSegment) => {
		if (isResizingRef.current) {
			return;
		}
		if (isSelecting()) {
			endSelection();
		}
		setModal({
			segment,
			date: segment.start,
			title: segment.event.title,
			allDay: segment.event.allDay,
			taskEvent: segment.event.taskEvent ?? false,
			isCompleted: Boolean(segment.event.completed),
			startTime: segment.event.startTime ?? '',
			endTime: segment.event.endTime ?? '',
			color: segment.event.color ?? '',
		});
	};
};

export const handleDateClickFactory = (
	getMoreMenu: () => { dateKey: string } | null,
	getDragging: () => EventSegment | null,
	popoverDragRef: { current: boolean },
	handleCloseMoreMenu: () => void,
	setCreateModal: (next: CreateEventState) => void,
) => {
	return (dateKey: string) => {
		if (getMoreMenu()) {
			if (getDragging() || popoverDragRef.current) return;
			handleCloseMoreMenu();
			return;
		}
		setCreateModal({
			title: '',
			startDate: dateKey,
			endDate: '',
			allDay: true,
			taskEvent: false,
			startTime: '',
			endTime: '',
			isCompleted: false,
			color: '',
		});
	};
};

export const handleModalSaveFactory = (
	getModal: () => EventModalState | null,
	onSaveEvent: (next: EditableEventResponse, previous: EditableEventResponse) => Promise<void> | void,
	setModal: (next: EventModalState | null) => void,
	notice: (message: string) => void,
) => {
	return (draft: {
		title: string;
		date: string;
		allDay: boolean;
		taskEvent: boolean;
		isCompleted: boolean;
		startTime: string;
		endTime: string;
		color: string;
	}) => {
		const modal = getModal();
		if (!modal) return;
		if (!draft.title.trim()) {
			notice('Please enter a title.');
			return;
		}
		if (!draft.allDay) {
			const hasStart = draft.startTime.trim().length > 0;
			const hasEnd = draft.endTime.trim().length > 0;
			if (!hasStart || !hasEnd) {
				notice('Start and end times are required for timed events.');
				return;
			}
		}
		const previous: EditableEventResponse = [modal.segment.event, modal.segment.location];
		const completed = draft.taskEvent ? draft.isCompleted : false;
		const normalizedColor = normalizeHexColor(draft.color);
		const nextEvent: CalendarEvent = {
			...modal.segment.event,
			title: draft.title,
			allDay: draft.allDay,
			date: draft.date,
			endDate: modal.segment.event.endDate,
			startDate: modal.segment.event.startDate,
			taskEvent: draft.taskEvent,
			completed,
			color: normalizedColor ?? undefined,
		};
		if (draft.allDay) {
			delete nextEvent.startTime;
			delete nextEvent.endTime;
		} else {
			nextEvent.startTime = draft.startTime;
			nextEvent.endTime = draft.endTime;
		}
		const next: EditableEventResponse = [nextEvent, modal.segment.location];
		void onSaveEvent(next, previous);
		setModal(null);
	};
};

export const handleCreateSaveFactory = (
	getCreateModal: () => CreateEventState | null,
	onCreateEvent: (event: CalendarEvent) => Promise<void> | void,
	setCreateModal: (next: CreateEventState | null) => void,
	notice: (message: string) => void,
) => {
	return (draft: {
		title: string;
		date: string;
		allDay: boolean;
		taskEvent: boolean;
		isCompleted: boolean;
		startTime: string;
		endTime: string;
		color: string;
	}) => {
		const createModal = getCreateModal();
		if (!createModal) return;
		if (!draft.title.trim()) {
			notice('Please enter a title.');
			return;
		}
		if (!draft.allDay) {
			const hasStart = draft.startTime.trim().length > 0;
			const hasEnd = draft.endTime.trim().length > 0;
			if (!hasStart || !hasEnd) {
				notice('Start and end times are required for timed events.');
				return;
			}
		}
		const normalizedColor = normalizeHexColor(draft.color);
		const nextEvent: CalendarEvent = {
			title: draft.title,
			allDay: draft.allDay,
			date: draft.date,
			taskEvent: draft.taskEvent,
			...(createModal.endDate && createModal.endDate !== draft.date
				? { endDate: createModal.endDate }
				: {}),
			...(draft.taskEvent ? { completed: draft.isCompleted } : {}),
			...(normalizedColor ? { color: normalizedColor } : {}),
		};
		if (draft.allDay) {
			delete nextEvent.startTime;
			delete nextEvent.endTime;
		} else {
			nextEvent.startTime = draft.startTime;
			nextEvent.endTime = draft.endTime;
		}
		void onCreateEvent(nextEvent);
		setCreateModal(null);
	};
};
