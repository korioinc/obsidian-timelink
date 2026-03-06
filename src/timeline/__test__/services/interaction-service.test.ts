import {
	createAllDayEventSegment as createSegment,
	createEventModalState as createModalState,
} from '../../../shared/__test__/helpers/event-factories.ts';
import { createEventInteractionHandlers } from '../../../shared/event/interaction-handlers.ts';
import type {
	CalendarEvent,
	CreateEventState,
	EventModalState,
	EventSegment,
} from '../../../shared/event/types';
import { assert, test } from 'vitest';

const createTimelineInteractionHandlers = (params: {
	modal: EventModalState | null;
	setModal: (next: EventModalState | null) => void;
	createModal: CreateEventState | null;
	setCreateModal: (next: CreateEventState | null) => void;
	timeSelectionIsSelecting: boolean;
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
		selectionIsSelecting: params.timeSelectionIsSelecting,
		endSelection: params.endSelection,
		isResizingRef: params.isResizingRef,
		onSaveEvent: params.onSaveEvent,
		onCreateEvent: params.onCreateEvent,
		onDeleteEvent: params.onDeleteEvent,
		onOpenNote: params.onOpenNote,
		notice: params.notice,
	});

	return {
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

void test('createTimelineInteractionHandlers event click closes selection and opens edit modal', () => {
	const segment = createSegment({
		title: 'Clicked',
		allDay: false,
		startTime: '09:00',
		endTime: '10:00',
	});
	let modalTitle = '';
	let modalStartTime = '';
	let modalEndTime = '';
	let endSelectionCount = 0;
	const handlers = createTimelineInteractionHandlers({
		modal: null,
		setModal: (next) => {
			if (!next) {
				return;
			}
			modalTitle = next.title;
			modalStartTime = next.startTime;
			modalEndTime = next.endTime;
		},
		createModal: null,
		setCreateModal: () => undefined,
		timeSelectionIsSelecting: true,
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
	assert.strictEqual(modalTitle, 'Clicked');
	assert.strictEqual(modalStartTime, '09:00');
	assert.strictEqual(modalEndTime, '10:00');
});

void test('createTimelineInteractionHandlers modal save reports notice for empty title', () => {
	const segment = createSegment();
	const modal = createModalState(segment);
	let noticeMessage = '';
	const handlers = createTimelineInteractionHandlers({
		modal,
		setModal: () => undefined,
		createModal: null,
		setCreateModal: () => undefined,
		timeSelectionIsSelecting: false,
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

void test('createTimelineInteractionHandlers create save triggers event creation and closes modal', () => {
	const createModal: CreateEventState = {
		title: '',
		startDate: '2026-03-02',
		endDate: '',
		allDay: true,
		taskEvent: false,
		startTime: '',
		endTime: '',
		isCompleted: false,
		color: '',
	};
	let createdTitle = '';
	let closeCount = 0;
	const handlers = createTimelineInteractionHandlers({
		modal: null,
		setModal: () => undefined,
		createModal,
		setCreateModal: (next) => {
			if (!next) {
				closeCount += 1;
			}
		},
		timeSelectionIsSelecting: false,
		endSelection: () => undefined,
		isResizingRef: { current: false },
		onSaveEvent: () => undefined,
		onCreateEvent: (event) => {
			createdTitle = event.title;
		},
		onDeleteEvent: () => undefined,
		onOpenNote: () => undefined,
		notice: () => undefined,
	});

	handlers.handleCreateSave({
		title: 'Created',
		date: '2026-03-02',
		allDay: true,
		taskEvent: false,
		isCompleted: false,
		startTime: '',
		endTime: '',
		color: '',
	});

	assert.strictEqual(createdTitle, 'Created');
	assert.strictEqual(closeCount, 1);
});

void test('createTimelineInteractionHandlers open note reports notice when path is missing', () => {
	const segment = createSegment({}, { location: { file: { path: '' }, lineNumber: undefined } });
	const modal = createModalState(segment);
	let noticeMessage = '';
	const handlers = createTimelineInteractionHandlers({
		modal,
		setModal: () => undefined,
		createModal: null,
		setCreateModal: () => undefined,
		timeSelectionIsSelecting: false,
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

	handlers.handleOpenNote();

	assert.strictEqual(noticeMessage, 'Unable to find the note path.');
});
