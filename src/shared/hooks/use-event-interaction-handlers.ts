import { requestDeleteEventConfirmation } from '../event-form/delete-event-confirmation';
import {
	createEventInteractionHandlers,
	type BuildEventInteractionHandlersParams,
} from '../event/interaction-handlers';
import { createNotice } from '../services/notice-service';
import { useEventModals } from './use-event-modals';
import type { App } from 'obsidian';
import { useEffect, useMemo } from 'preact/hooks';

export type UseEventInteractionHandlersParams = Omit<
	BuildEventInteractionHandlersParams,
	'confirmDeleteEvent' | 'notice'
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
	const deleteConfirmationController = useMemo(() => new AbortController(), []);
	useEffect(
		() => () => {
			deleteConfirmationController.abort();
		},
		[deleteConfirmationController],
	);
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
				confirmDeleteEvent: (entry) =>
					requestDeleteEventConfirmation(app, entry[1], deleteConfirmationController.signal),
				onOpenNote,
				notice,
				dateClick,
			}),
		[
			createModal,
			dateClick,
			deleteConfirmationController,
			endSelection,
			isResizingRef,
			modal,
			notice,
			app,
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
