import {
	useEventInteractionHandlers,
	type UseEventInteractionHandlersParams,
} from '../../shared/hooks/use-event-interaction-handlers';
import type { CreateEventState, EventModalState } from '../types';
import type { EventSegment } from '../types';
import { useCallback, useState } from 'preact/hooks';

export type UseCalendarInteractionHandlersParams = Omit<
	UseEventInteractionHandlersParams,
	'dateClick'
> & {
	dateClick?: {
		moreMenu: { dateKey: string } | null;
		setMoreMenu: (next: { dateKey: string } | null) => void;
		dragging: EventSegment | null;
		popoverDragRef: { current: boolean };
	};
};

export type CalendarModalState = {
	modal: EventModalState | null;
	setModal: (next: EventModalState | null) => void;
	createModal: CreateEventState | null;
	setCreateModal: (next: CreateEventState | null) => void;
};

export type CalendarMoreMenuState = {
	moreMenu: { dateKey: string } | null;
	setMoreMenu: (next: { dateKey: string } | null) => void;
	handleCloseMoreMenu: () => void;
};

export const useCalendarModalState = (): CalendarModalState => {
	const [modal, setModal] = useState<EventModalState | null>(null);
	const [createModal, setCreateModal] = useState<CreateEventState | null>(null);
	return {
		modal,
		setModal,
		createModal,
		setCreateModal,
	};
};

export const useCalendarMoreMenuState = (): CalendarMoreMenuState => {
	const [moreMenu, setMoreMenu] = useState<{ dateKey: string } | null>(null);
	const handleCloseMoreMenu = useCallback(() => {
		setMoreMenu(null);
	}, []);
	return {
		moreMenu,
		setMoreMenu,
		handleCloseMoreMenu,
	};
};

export const useCalendarInteractionHandlers = ({
	app,
	modal,
	createModal,
	setModal,
	setCreateModal,
	dateClick,
	selectionIsSelecting,
	endSelection,
	isResizingRef,
	onSaveEvent,
	onCreateEvent,
	onDeleteEvent,
	onOpenNote,
}: UseCalendarInteractionHandlersParams) => {
	const handlers = useEventInteractionHandlers({
		app,
		modal,
		setModal,
		createModal,
		setCreateModal,
		selectionIsSelecting,
		endSelection,
		isResizingRef,
		onSaveEvent,
		onCreateEvent,
		onDeleteEvent,
		onOpenNote,
		dateClick: {
			moreMenu: dateClick?.moreMenu ?? null,
			setMoreMenu: dateClick?.setMoreMenu ?? (() => undefined),
			dragging: dateClick?.dragging ?? null,
			popoverDragRef: dateClick?.popoverDragRef ?? { current: false },
		},
	});
	const handleDateClick = handlers.handleDateClick;
	if (!handleDateClick) {
		throw new Error('Calendar date click handler was not initialized.');
	}

	return {
		handleDateClick,
		handleEventClick: handlers.handleEventClick,
		handleToggleCompleted: handlers.handleToggleCompleted,
	};
};
