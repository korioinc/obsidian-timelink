import {
	EventFormModal,
	type EventFormProps,
	type EventFormDraft,
} from './_components/EventFormModal';
import type { CreateEventState, EventModalState } from './types';
import type { App } from 'obsidian';
import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

type UseCalendarModalsProps = {
	app: App;
	modal: EventModalState | null;
	createModal: CreateEventState | null;
	onEditSave: (draft: EventFormDraft) => void;
	onEditDelete: () => void;
	onOpenNote: () => void;
	onCloseEdit: () => void;
	onCreateSave: (draft: EventFormDraft) => void;
	onCloseCreate: () => void;
};

type ModalController = {
	wasOpenRef: { current: boolean };
	modalRef: { current: EventFormModal | null };
	titleRef: RefObject<HTMLInputElement>;
};

const focusTitleInput = (titleRef: RefObject<HTMLInputElement>) => {
	requestAnimationFrame(() => {
		titleRef.current?.focus();
		titleRef.current?.select();
	});
};

const closeModal = (controller: ModalController) => {
	controller.wasOpenRef.current = false;
	controller.modalRef.current?.close();
	controller.modalRef.current = null;
};

const openOrUpdateModal = (app: App, controller: ModalController, props: EventFormProps) => {
	if (!controller.wasOpenRef.current) {
		controller.wasOpenRef.current = true;
		controller.modalRef.current = new EventFormModal(app, props);
		controller.modalRef.current.open();
		focusTitleInput(controller.titleRef);
		return;
	}
	controller.modalRef.current?.updateProps(props);
};

const useModalController = (): ModalController => {
	const titleRef = useRef<HTMLInputElement | null>(null);
	const wasOpenRef = useRef(false);
	const modalRef = useRef<EventFormModal | null>(null);
	return { titleRef, wasOpenRef, modalRef };
};

const buildEditProps = (
	modal: EventModalState,
	controller: ModalController,
	handlers: Pick<
		UseCalendarModalsProps,
		'onEditSave' | 'onEditDelete' | 'onOpenNote' | 'onCloseEdit'
	>,
): EventFormProps => {
	return {
		headerTitle: 'Edit event',
		title: modal.title,
		date: modal.date,
		endDate: modal.segment.event.endDate ?? undefined,
		allDay: modal.allDay,
		taskEvent: modal.taskEvent,
		isCompleted: modal.isCompleted,
		startTime: modal.startTime,
		endTime: modal.endTime,
		color: modal.color,
		primaryActionLabel: 'Save Event',
		secondaryActionLabel: 'Delete Event',
		allDayLabel: 'All day event',
		taskEventLabel: 'Task Event',
		completedLabel: 'Completed?',
		noteActionLabel: 'Open Note',
		primaryAction: handlers.onEditSave,
		secondaryAction: handlers.onEditDelete,
		noteAction: handlers.onOpenNote,
		onClose: handlers.onCloseEdit,
		titleRef: controller.titleRef,
		submitOnTitleEnter: true,
	};
};

const buildCreateProps = (
	createModal: CreateEventState,
	controller: ModalController,
	handlers: Pick<UseCalendarModalsProps, 'onCreateSave' | 'onCloseCreate'>,
): EventFormProps => {
	return {
		headerTitle: 'Create event',
		title: createModal.title,
		date: createModal.startDate,
		endDate: createModal.endDate,
		allDay: createModal.allDay,
		taskEvent: createModal.taskEvent,
		isCompleted: createModal.isCompleted,
		startTime: createModal.startTime,
		endTime: createModal.endTime,
		color: createModal.color,
		primaryActionLabel: 'Save Event',
		allDayLabel: 'All day event',
		taskEventLabel: 'Task Event',
		completedLabel: 'Completed?',
		titlePlaceholder: 'Title',
		primaryAction: handlers.onCreateSave,
		onClose: handlers.onCloseCreate,
		titleRef: controller.titleRef,
		submitOnTitleEnter: true,
	};
};

export const useCalendarModals = ({
	app,
	modal,
	createModal,
	onEditSave,
	onEditDelete,
	onOpenNote,
	onCloseEdit,
	onCreateSave,
	onCloseCreate,
}: UseCalendarModalsProps) => {
	const editController = useModalController();
	const createController = useModalController();

	useEffect(() => {
		if (!modal) {
			closeModal(editController);
			return;
		}
		const props = buildEditProps(modal, editController, {
			onEditSave,
			onEditDelete,
			onOpenNote,
			onCloseEdit,
		});
		openOrUpdateModal(app, editController, props);
	}, [app, editController, modal, onEditDelete, onEditSave, onOpenNote, onCloseEdit]);

	useEffect(() => {
		if (!createModal) {
			closeModal(createController);
			return;
		}
		const props = buildCreateProps(createModal, createController, {
			onCreateSave,
			onCloseCreate,
		});
		openOrUpdateModal(app, createController, props);
	}, [app, createController, createModal, onCloseCreate, onCreateSave]);
};
