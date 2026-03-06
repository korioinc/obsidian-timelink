import { normalizeHexColor } from '../color/normalize-hex-color';
import { addDays, compareDateKey, formatDateKey, parseDateKey, toMinutes } from './model-utils';
import type {
	CalendarEvent,
	CreateEventState,
	EditableEventResponse,
	EventModalState,
	EventSegment,
} from './types';

type EventDraft = {
	title: string;
	date: string;
	allDay: boolean;
	taskEvent: boolean;
	isCompleted: boolean;
	startTime: string;
	endTime: string;
	color: string;
};

export type EventChangeHandler = (
	next: EditableEventResponse,
	previous: EditableEventResponse,
) => Promise<void> | void;

export type CreateEventHandler = (event: CalendarEvent) => Promise<void> | void;
export type DeleteEventHandler = (event: EditableEventResponse) => Promise<void> | void;
const MINUTES_IN_DAY = 24 * 60;

const normalizeEventEndDate = (startDate: string, endDate?: string | null): string | undefined => {
	if (!endDate) return undefined;
	const normalized = compareDateKey(endDate, startDate) < 0 ? startDate : endDate;
	return normalized === startDate ? undefined : normalized;
};

const validateEventDraft = (draft: EventDraft): string | null => {
	if (!draft.title.trim()) {
		return 'Please enter a title.';
	}
	if (!draft.allDay) {
		const hasStart = draft.startTime.trim().length > 0;
		const hasEnd = draft.endTime.trim().length > 0;
		if (!hasStart || !hasEnd) {
			return 'Start and end times are required for timed events.';
		}
	}
	return null;
};

const applyDraftTimeFields = (event: CalendarEvent, draft: EventDraft): CalendarEvent => {
	if (draft.allDay) {
		delete event.startTime;
		delete event.endTime;
		return event;
	}
	event.startTime = draft.startTime;
	event.endTime = draft.endTime;
	return event;
};

const parseBoundaryMinutes = (value?: string | null): number | null => {
	const parsed = toMinutes(value);
	if (parsed !== null) return parsed;
	return value?.trim() === '24:00' ? MINUTES_IN_DAY : null;
};

const normalizeLegacyTimedEventBoundary = (event: CalendarEvent): CalendarEvent => {
	if (event.allDay) return event;
	const dateKey = event.date;
	if (!dateKey) return event;
	const endMinutes = parseBoundaryMinutes(event.endTime);
	if (endMinutes !== MINUTES_IN_DAY) return event;
	const baseEndDate = event.endDate ?? dateKey;
	const normalizedEndDate = formatDateKey(addDays(parseDateKey(baseEndDate), 1));
	return {
		...event,
		endDate: normalizedEndDate,
		endTime: '00:00',
	};
};

const buildEventModalState = (segment: EventSegment): EventModalState => {
	const normalizedEvent = normalizeLegacyTimedEventBoundary(segment.event);
	const normalizedSegment =
		normalizedEvent === segment.event ? segment : { ...segment, event: normalizedEvent };
	return {
		segment: normalizedSegment,
		date: segment.start,
		title: normalizedEvent.title,
		allDay: normalizedEvent.allDay,
		taskEvent: normalizedEvent.taskEvent ?? false,
		isCompleted: Boolean(normalizedEvent.completed),
		startTime: normalizedEvent.startTime ?? '',
		endTime: normalizedEvent.endTime ?? '',
		color: normalizedEvent.color ?? '',
	};
};

type BuildModalActionHandlersParams = {
	modal: EventModalState | null;
	setModal: (next: EventModalState | null) => void;
	onDeleteEvent: DeleteEventHandler;
	onOpenNote: (path: string) => void;
	notice: (message: string) => void;
};

export const buildModalActionHandlers = ({
	modal,
	setModal,
	onDeleteEvent,
	onOpenNote,
	notice,
}: BuildModalActionHandlersParams) => {
	const handleModalDelete = () => {
		if (!modal) return;
		void onDeleteEvent([modal.segment.event, modal.segment.location]);
		setModal(null);
	};

	const handleOpenNote = () => {
		if (!modal?.segment.location.file.path) {
			notice('Unable to find the note path.');
			return;
		}
		onOpenNote(modal.segment.location.file.path);
	};

	const handleCloseEditModal = () => {
		setModal(null);
	};

	return { handleModalDelete, handleOpenNote, handleCloseEditModal };
};

export const handleToggleCompletedFactory = (onSaveEvent: EventChangeHandler) => {
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

export const createGridEventClickHandler = (
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
		setModal(buildEventModalState(segment));
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
	onSaveEvent: EventChangeHandler,
	setModal: (next: EventModalState | null) => void,
	notice: (message: string) => void,
) => {
	return (draft: EventDraft) => {
		const modal = getModal();
		if (!modal) return;
		const validationError = validateEventDraft(draft);
		if (validationError) {
			notice(validationError);
			return;
		}
		const previous: EditableEventResponse = [modal.segment.event, modal.segment.location];
		const completed = draft.taskEvent ? draft.isCompleted : false;
		const normalizedColor = normalizeHexColor(draft.color);
		const normalizedEndDate = normalizeEventEndDate(draft.date, modal.segment.event.endDate);
		const nextEvent: CalendarEvent = {
			...modal.segment.event,
			title: draft.title,
			allDay: draft.allDay,
			date: draft.date,
			endDate: normalizedEndDate,
			startDate: modal.segment.event.startDate,
			taskEvent: draft.taskEvent,
			completed,
			color: normalizedColor ?? undefined,
		};
		applyDraftTimeFields(nextEvent, draft);
		const next: EditableEventResponse = [nextEvent, modal.segment.location];
		void onSaveEvent(next, previous);
		setModal(null);
	};
};

export const handleCreateSaveFactory = (
	getCreateModal: () => CreateEventState | null,
	onCreateEvent: CreateEventHandler,
	setCreateModal: (next: CreateEventState | null) => void,
	notice: (message: string) => void,
) => {
	return (draft: EventDraft) => {
		const createModal = getCreateModal();
		if (!createModal) return;
		const validationError = validateEventDraft(draft);
		if (validationError) {
			notice(validationError);
			return;
		}
		const normalizedColor = normalizeHexColor(draft.color);
		const normalizedEndDate = normalizeEventEndDate(draft.date, createModal.endDate);
		const nextEvent: CalendarEvent = {
			title: draft.title,
			allDay: draft.allDay,
			date: draft.date,
			taskEvent: draft.taskEvent,
			...(normalizedEndDate ? { endDate: normalizedEndDate } : {}),
			...(draft.taskEvent ? { completed: draft.isCompleted } : {}),
			...(normalizedColor ? { color: normalizedColor } : {}),
		};
		applyDraftTimeFields(nextEvent, draft);
		void onCreateEvent(nextEvent);
		setCreateModal(null);
	};
};
