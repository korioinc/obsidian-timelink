import { isActiveDropTarget, readOrderByDataAttr, restoreOrder } from '../utils/card-dnd';
import { draggableToLinks, getObsidianDraggable } from '../utils/obsidian-drag-links';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	draggable,
	dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { App } from 'obsidian';
import { useEffect } from 'preact/hooks';

type ElementRef<T extends HTMLElement> = {
	current: T | null;
};

type LaneDragData = {
	type: 'lane';
	laneId: string;
};

function isLaneDragData(data: Record<string, unknown>): data is LaneDragData {
	return data.type === 'lane' && typeof data.laneId === 'string';
}

type UseLaneDndOptions = {
	wrapperRef: ElementRef<HTMLDivElement>;
	laneRef: ElementRef<HTMLDivElement>;
	dragHandleRef: ElementRef<HTMLDivElement>;
	laneId: string;
	isInteractionLocked: boolean;
	isListView: boolean;
	onReorderLanes: (order: string[]) => Promise<void>;
};

export function useLaneDnd({
	wrapperRef,
	laneRef,
	dragHandleRef,
	laneId,
	isInteractionLocked,
	isListView,
	onReorderLanes,
}: UseLaneDndOptions): void {
	useEffect(() => {
		const wrapper = wrapperRef.current;
		const laneEl = laneRef.current;
		const handleEl = dragHandleRef.current;
		if (!wrapper || !laneEl || !handleEl) return;

		let laneOrder: string[] | null = null;
		return combine(
			draggable({
				element: laneEl,
				dragHandle: handleEl,
				canDrag: ({ input }) => input.button === 0 && !isInteractionLocked,
				getInitialData: () => ({ type: 'lane', laneId }),
				onDragStart: () => {
					laneEl.classList.add('opacity-40');
					laneOrder = readOrderByDataAttr(wrapper, 'laneId');
				},
				onDrop: ({ location }) => {
					laneEl.classList.remove('opacity-40');
					if (location.current.dropTargets.length === 0 && laneOrder) {
						restoreOrder(wrapper, laneOrder, 'data-lane-id');
					}
					laneOrder = null;
				},
			}),
			dropTargetForElements({
				element: laneEl,
				canDrop: ({ source }) => isLaneDragData(source.data),
				onDrag: ({ source, location }) => {
					if (!isLaneDragData(source.data)) return;
					if (!isActiveDropTarget(laneEl, location.current.dropTargets)) return;
					const input = location.current.input;
					const draggedEl = source.element;
					if (!draggedEl || draggedEl === laneEl) return;
					const rect = laneEl.getBoundingClientRect();
					const insertBefore = isListView
						? input.clientY < rect.top + rect.height / 2
						: input.clientX < rect.left + rect.width / 2;
					const alreadyBefore = laneEl.previousSibling === draggedEl;
					const alreadyAfter = laneEl.nextSibling === draggedEl;
					if ((insertBefore && alreadyBefore) || (!insertBefore && alreadyAfter)) return;
					wrapper.insertBefore(draggedEl, insertBefore ? laneEl : laneEl.nextSibling);
				},
				onDrop: ({ source, location }) => {
					if (!isLaneDragData(source.data)) return;
					if (!isActiveDropTarget(laneEl, location.current.dropTargets)) return;
					const order = readOrderByDataAttr(wrapper, 'laneId');
					void onReorderLanes(order);
				},
			}),
		);
	}, [dragHandleRef, isInteractionLocked, isListView, laneId, laneRef, onReorderLanes, wrapperRef]);
}

type UseObsidianLinkDropOptions = {
	app: App;
	sourcePath: string;
	laneId: string;
	laneRef: ElementRef<HTMLDivElement>;
	listRef: ElementRef<HTMLUListElement>;
	isInteractionLocked: boolean;
	onAddCard: (laneId: string, title: string) => Promise<void>;
};

const resolveDroppedObsidianLinks = ({
	app,
	sourcePath,
	isInteractionLocked,
}: Pick<UseObsidianLinkDropOptions, 'app' | 'sourcePath' | 'isInteractionLocked'>):
	| string[]
	| null => {
	if (isInteractionLocked) return null;
	const draggable = getObsidianDraggable(app);
	const links = draggableToLinks(app, sourcePath, draggable);
	if (links.length === 0) return null;
	return links;
};

export function useObsidianLinkDrop({
	app,
	sourcePath,
	laneId,
	laneRef,
	listRef,
	isInteractionLocked,
	onAddCard,
}: UseObsidianLinkDropOptions): void {
	useEffect(() => {
		const listEl = listRef.current;
		const laneEl = laneRef.current;
		if (!laneEl) return;

		const dropTarget = listEl ?? laneEl;
		const handleDragOver = (event: DragEvent) => {
			const links = resolveDroppedObsidianLinks({ app, sourcePath, isInteractionLocked });
			if (!links) return;
			event.preventDefault();
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = 'copy';
			}
		};

		const handleDrop = (event: DragEvent) => {
			const links = resolveDroppedObsidianLinks({ app, sourcePath, isInteractionLocked });
			if (!links) return;
			event.preventDefault();
			links.forEach((link) => {
				void onAddCard(laneId, link);
			});
		};

		dropTarget.addEventListener('dragover', handleDragOver);
		dropTarget.addEventListener('drop', handleDrop);
		return () => {
			dropTarget.removeEventListener('dragover', handleDragOver);
			dropTarget.removeEventListener('drop', handleDrop);
		};
	}, [app, isInteractionLocked, laneId, laneRef, listRef, onAddCard, sourcePath]);
}
