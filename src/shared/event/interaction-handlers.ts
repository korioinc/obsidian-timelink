import {
	buildModalActionHandlers,
	createGridEventClickHandler,
	handleCreateSaveFactory,
	handleDateClickFactory,
	handleModalSaveFactory,
	handleToggleCompletedFactory,
	type CreateEventHandler,
	type DeleteEventHandler,
	type EventChangeHandler,
} from './modal-interaction';
import type { CreateEventState, EventModalState, EventSegment } from './types';

type DateClickDependencies = {
	moreMenu: { dateKey: string } | null;
	setMoreMenu: (next: { dateKey: string } | null) => void;
	dragging: EventSegment | null;
	popoverDragRef: { current: boolean };
};

export type BuildEventInteractionHandlersParams = {
	modal: EventModalState | null;
	setModal: (next: EventModalState | null) => void;
	createModal: CreateEventState | null;
	setCreateModal: (next: CreateEventState | null) => void;
	selectionIsSelecting: boolean;
	endSelection: () => void;
	isResizingRef: { current: boolean };
	onSaveEvent: EventChangeHandler;
	onCreateEvent: CreateEventHandler;
	onDeleteEvent: DeleteEventHandler;
	onOpenNote: (path: string) => void;
	notice: (message: string) => void;
	dateClick?: DateClickDependencies;
};

export const createEventInteractionHandlers = ({
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
	notice,
	dateClick,
}: BuildEventInteractionHandlersParams) => {
	const handleModalSave = handleModalSaveFactory(() => modal, onSaveEvent, setModal, notice);
	const handleCreateSave = handleCreateSaveFactory(
		() => createModal,
		onCreateEvent,
		setCreateModal,
		notice,
	);
	const handleEventClick = createGridEventClickHandler(
		(next) => setModal(next),
		endSelection,
		() => selectionIsSelecting,
		isResizingRef,
	);
	const handleToggleCompleted = handleToggleCompletedFactory(onSaveEvent);

	const { handleModalDelete, handleOpenNote, handleCloseEditModal } = buildModalActionHandlers({
		modal,
		setModal,
		onDeleteEvent,
		onOpenNote,
		notice,
	});

	const handleCloseCreateModal = () => {
		setCreateModal(null);
	};

	const handleDateClick = dateClick
		? handleDateClickFactory(
				() => dateClick.moreMenu,
				() => dateClick.dragging,
				dateClick.popoverDragRef,
				() => {
					dateClick.setMoreMenu(null);
				},
				(next) => {
					setCreateModal(next);
				},
			)
		: undefined;

	return {
		handleDateClick,
		handleEventClick,
		handleToggleCompleted,
		handleModalSave,
		handleCreateSave,
		handleModalDelete,
		handleOpenNote,
		handleCloseEditModal,
		handleCloseCreateModal,
	};
};
