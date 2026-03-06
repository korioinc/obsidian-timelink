import {
	createEventInteractionHandlers,
	type BuildEventInteractionHandlersParams,
} from '../event/interaction-handlers';
import { createNotice } from '../services/notice-service';
import { useEventModals } from './use-event-modals';
import type { App } from 'obsidian';
import { useMemo } from 'preact/hooks';

export type UseEventInteractionHandlersParams = Omit<
	BuildEventInteractionHandlersParams,
	'notice'
> & {
	app: App;
};

export const useEventInteractionHandlers = ({
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
	dateClick,
}: UseEventInteractionHandlersParams) => {
	const notice = useMemo(() => createNotice(), []);
	const handlers = useMemo(
		() =>
			createEventInteractionHandlers({
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
			}),
		[
			createModal,
			dateClick,
			endSelection,
			isResizingRef,
			modal,
			notice,
			onCreateEvent,
			onDeleteEvent,
			onOpenNote,
			onSaveEvent,
			selectionIsSelecting,
			setCreateModal,
			setModal,
		],
	);

	useEventModals({
		app,
		modal,
		createModal,
		onEditSave: handlers.handleModalSave,
		onEditDelete: handlers.handleModalDelete,
		onOpenNote: handlers.handleOpenNote,
		onCloseEdit: handlers.handleCloseEditModal,
		onCreateSave: handlers.handleCreateSave,
		onCloseCreate: handlers.handleCloseCreateModal,
	});

	return handlers;
};
