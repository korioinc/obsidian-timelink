import type { EditableEventResponse } from '../../shared/event/types';
import { registerWindowPointerMoveAndUp } from '../../shared/hooks/window-pointer-events';
import { deriveDragAndResizeState } from '../services/interaction/derivers';
import {
	beginDragFromPopoverFactory,
	createDragCaptureHandlers,
	createDragImage,
	handleDragEndFactory,
	handleDragStartFactory,
	handleDropFactory,
} from '../services/interaction/drag';
import {
	createResizeEffectHandlers,
	handleResizeStartFactory,
} from '../services/interaction/resize';
import type { EventSegment } from '../types';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

type AllDayEventChangeHandler = (
	next: EditableEventResponse,
	previous: EditableEventResponse,
) => Promise<void> | void;

type UseAllDayEventInteractionsParams = {
	getDateKeyFromPointer: (clientX: number, clientY: number) => string | null;
	indexByDateKey: Map<string, number>;
	onMoveEvent: AllDayEventChangeHandler;
	onSaveEvent: AllDayEventChangeHandler;
	isResizingRef: { current: boolean };
	popoverDragRef: { current: boolean };
};

type UseAllDayEventInteractionsResult = {
	dragging: EventSegment | null;
	allDayResizing: EventSegment | null;
	dragRange: { start: string; end: string } | null;
	resizeRange: { start: string; end: string } | null;
	dragHoverIndex: number | null;
	handleDragStart: (event: DragEvent, segment: EventSegment) => void;
	handleDragEnd: () => void;
	handleResizeBarStart: (segment: EventSegment) => void;
	beginDragFromPopover: (event: DragEvent, segment: EventSegment) => void;
	handleDragOverCapture: (event: DragEvent) => void;
	handleDragEnterCapture: (event: DragEvent) => void;
	handleDropCapture: (event: DragEvent) => void;
};

export const useAllDayEventInteractions = ({
	getDateKeyFromPointer,
	indexByDateKey,
	onMoveEvent,
	onSaveEvent,
	isResizingRef,
	popoverDragRef,
}: UseAllDayEventInteractionsParams): UseAllDayEventInteractionsResult => {
	const [dragging, setDragging] = useState<EventSegment | null>(null);
	const [dragHoverDateKey, setDragHoverDateKey] = useState<string | null>(null);
	const [allDayResizing, setAllDayResizing] = useState<EventSegment | null>(null);
	const [allDayResizeHoverDateKey, setAllDayResizeHoverDateKey] = useState<string | null>(null);
	const didDropRef = useRef(false);

	const { dragRange, resizeRange, dragHoverIndex } = useMemo(
		() =>
			deriveDragAndResizeState(
				dragging,
				dragHoverDateKey,
				allDayResizing,
				allDayResizeHoverDateKey,
				indexByDateKey,
			),
		[dragging, dragHoverDateKey, allDayResizing, allDayResizeHoverDateKey, indexByDateKey],
	);

	const handleDrop = handleDropFactory(
		() => dragging,
		setDragging,
		setDragHoverDateKey,
		onMoveEvent,
		didDropRef,
	);

	const handleDragEnd = handleDragEndFactory(
		() => dragging,
		() => dragHoverDateKey,
		handleDrop,
		setDragging,
		setDragHoverDateKey,
		didDropRef,
		popoverDragRef,
	);

	const handleDragStart = handleDragStartFactory(
		setDragging,
		setDragHoverDateKey,
		didDropRef,
		getDateKeyFromPointer,
	);

	const handleResizeStart = handleResizeStartFactory(
		setAllDayResizing,
		setAllDayResizeHoverDateKey,
	);
	const handleResizeBarStart = (segment: EventSegment) => {
		isResizingRef.current = true;
		handleResizeStart(segment);
	};
	const beginDragFromPopover = beginDragFromPopoverFactory(
		setDragging,
		setDragHoverDateKey,
		didDropRef,
		popoverDragRef,
		createDragImage,
	);

	useEffect(() => {
		const handlers = createResizeEffectHandlers(
			allDayResizing,
			allDayResizeHoverDateKey,
			getDateKeyFromPointer,
			setAllDayResizeHoverDateKey,
			onSaveEvent,
			setAllDayResizing,
			isResizingRef,
		);
		if (!handlers) return;
		const { handlePointerMove, handlePointerUp } = handlers;
		return registerWindowPointerMoveAndUp(handlePointerMove, handlePointerUp);
	}, [allDayResizing, allDayResizeHoverDateKey, getDateKeyFromPointer, onSaveEvent, isResizingRef]);

	const { handleDragOverCapture, handleDragEnterCapture, handleDropCapture } =
		createDragCaptureHandlers(
			() => dragging,
			getDateKeyFromPointer,
			setDragHoverDateKey,
			handleDrop,
		);

	return {
		dragging,
		allDayResizing,
		dragRange,
		resizeRange,
		dragHoverIndex,
		handleDragStart,
		handleDragEnd,
		handleResizeBarStart,
		beginDragFromPopover,
		handleDragOverCapture,
		handleDragEnterCapture,
		handleDropCapture,
	};
};
