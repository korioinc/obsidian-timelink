import {
	createAllDayEventSegment as createSegment,
	createEventModalState as createModalState,
} from '../../../shared/__test__/helpers/event-factories.ts';
import { createEventInteractionHandlers } from '../../../shared/event/interaction-handlers.ts';
import type { CalendarEvent, CreateEventState, EventModalState, EventSegment } from '../../types';
import { assert, test } from 'vitest';

const createCalendarInteractionHandlers = (params: {
	modal: EventModalState | null;
	setModal: (next: EventModalState | null) => void;
	createModal: CreateEventState | null;
	setCreateModal: (next: CreateEventState | null) => void;
	moreMenu: { dateKey: string } | null;
	setMoreMenu: (next: { dateKey: string } | null) => void;
	dragging: EventSegment | null;
	popoverDragRef: { current: boolean };
	selectionIsSelecting: boolean;
	endSelection: () => void;
	isResizingRef: { current: boolean };
	onSaveEvent: (
		next: [CalendarEvent, EventSegment['location']],
		previous: [CalendarEvent, EventSegment['location']],
	) => void;
	onCreateEvent: (event: CalendarEvent) => void;
	onDeleteEvent: (event: [CalendarEvent, EventSegment['location']]) => void;
	onOpenNote: (path: string) => void;
	notice: (message: string) => void;
}) => {
	const handlers = createEventInteractionHandlers({
		modal: params.modal,
		setModal: params.setModal,
		createModal: params.createModal,
		setCreateModal: params.setCreateModal,
		selectionIsSelecting: params.selectionIsSelecting,
		endSelection: params.endSelection,
		isResizingRef: params.isResizingRef,
		onSaveEvent: params.onSaveEvent,
		onCreateEvent: params.onCreateEvent,
		onDeleteEvent: params.onDeleteEvent,
		onOpenNote: params.onOpenNote,
		notice: params.notice,
		dateClick: {
			moreMenu: params.moreMenu,
			setMoreMenu: params.setMoreMenu,
			dragging: params.dragging,
			popoverDragRef: params.popoverDragRef,
		},
	});

	return {
		handleDateClick: handlers.handleDateClick as NonNullable<typeof handlers.handleDateClick>,
		handleEventClick: handlers.handleEventClick,
		handleToggleCompleted: handlers.handleToggleCompleted,
		handleModalSave: handlers.handleModalSave,
		handleCreateSave: handlers.handleCreateSave,
		handleModalDelete: handlers.handleModalDelete,
		handleOpenNote: handlers.handleOpenNote,
		handleCloseEditModal: handlers.handleCloseEditModal,
		handleCloseCreateModal: handlers.handleCloseCreateModal,
	};
};

void test('createCalendarInteractionHandlers opens create modal on date click when menu is closed', () => {
	let createModalState: CreateEventState | null = null;
	let createStartDate = '';
	let createEndDate = '';
	let createAllDay: boolean | null = null;
	const handlers = createCalendarInteractionHandlers({
		modal: null,
		setModal: () => undefined,
		createModal: null,
		setCreateModal: (next) => {
			createModalState = next;
			if (!next) return;
			createStartDate = next.startDate;
			createEndDate = next.endDate;
			createAllDay = next.allDay;
		},
		moreMenu: null,
		setMoreMenu: () => undefined,
		dragging: null,
		popoverDragRef: { current: false },
		selectionIsSelecting: false,
		endSelection: () => undefined,
		isResizingRef: { current: false },
		onSaveEvent: () => undefined,
		onCreateEvent: () => undefined,
		onDeleteEvent: () => undefined,
		onOpenNote: () => undefined,
		notice: () => undefined,
	});

	handlers.handleDateClick('2026-03-05');

	assert.ok(createModalState);
	assert.strictEqual(createStartDate, '2026-03-05');
	assert.strictEqual(createEndDate, '');
	assert.strictEqual(createAllDay, true);
});

void test('createCalendarInteractionHandlers event click closes selection and opens edit modal', () => {
	const segment = createSegment({
		title: 'Clicked',
		allDay: false,
		startTime: '09:00',
		endTime: '10:00',
	});
	let modalState: EventModalState | null = null;
	let modalTitle = '';
	let modalAllDay: boolean | null = null;
	let modalStartTime = '';
	let modalEndTime = '';
	let endSelectionCount = 0;
	const handlers = createCalendarInteractionHandlers({
		modal: null,
		setModal: (next) => {
			modalState = next;
			if (!next) return;
			modalTitle = next.title;
			modalAllDay = next.allDay;
			modalStartTime = next.startTime;
			modalEndTime = next.endTime;
		},
		createModal: null,
		setCreateModal: () => undefined,
		moreMenu: null,
		setMoreMenu: () => undefined,
		dragging: null,
		popoverDragRef: { current: false },
		selectionIsSelecting: true,
		endSelection: () => {
			endSelectionCount += 1;
		},
		isResizingRef: { current: false },
		onSaveEvent: () => undefined,
		onCreateEvent: () => undefined,
		onDeleteEvent: () => undefined,
		onOpenNote: () => undefined,
		notice: () => undefined,
	});

	handlers.handleEventClick(segment);

	assert.strictEqual(endSelectionCount, 1);
	assert.ok(modalState);
	assert.strictEqual(modalTitle, 'Clicked');
	assert.strictEqual(modalAllDay, false);
	assert.strictEqual(modalStartTime, '09:00');
	assert.strictEqual(modalEndTime, '10:00');
});

void test('createCalendarInteractionHandlers modal save reports notice for empty title', () => {
	const segment = createSegment();
	const modal = createModalState(segment);
	let noticeMessage = '';
	const handlers = createCalendarInteractionHandlers({
		modal,
		setModal: () => undefined,
		createModal: null,
		setCreateModal: () => undefined,
		moreMenu: null,
		setMoreMenu: () => undefined,
		dragging: null,
		popoverDragRef: { current: false },
		selectionIsSelecting: false,
		endSelection: () => undefined,
		isResizingRef: { current: false },
		onSaveEvent: () => undefined,
		onCreateEvent: () => undefined,
		onDeleteEvent: () => undefined,
		onOpenNote: () => undefined,
		notice: (message) => {
			noticeMessage = message;
		},
	});

	handlers.handleModalSave({
		title: ' ',
		date: '2026-03-01',
		allDay: true,
		taskEvent: false,
		isCompleted: false,
		startTime: '',
		endTime: '',
		color: '',
	});

	assert.strictEqual(noticeMessage, 'Please enter a title.');
});
