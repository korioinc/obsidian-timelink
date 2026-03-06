import {
	buildTimedResizeEvent,
	deriveTimedDragRange,
	deriveTimedResizeRange,
} from '../event/time-grid-interactions';
import { buildTimedDragDropEvent } from '../event/time-grid-interactions';
import {
	deriveTimedDragStartState,
	deriveTimedResizeStartState,
	resolveTimedColor,
} from '../event/timed-interaction-state';
import type { EditableEventResponse, EventSegment, TimeSelectionRange } from '../event/types';
import { registerWindowPointerMoveAndUp } from './window-pointer-events';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

type TimedPointerState = {
	dateKey: string;
	minutes: number;
};

type TimedChangeHandler = (
	next: EditableEventResponse,
	previous: EditableEventResponse,
) => Promise<void> | void;

export type ResizeCommitEntries = {
	next: EditableEventResponse;
	previous: EditableEventResponse;
};

type UseTimedGridEventInteractionsParams = {
	defaultEventColor: string;
	isResizingRef: { current: boolean };
	onSaveEvent: TimedChangeHandler;
	onMoveEvent: TimedChangeHandler;
	resolvePointerState: (params: {
		clientX: number;
		clientY: number;
		gridElement: HTMLDivElement;
	}) => TimedPointerState | null;
	resolveDragOverState?: (params: {
		event: DragEvent;
		gridElement: HTMLDivElement;
	}) => TimedPointerState | null;
	canDragSegment?: (segment: EventSegment) => boolean;
	onDragStart?: (event: DragEvent, segment: EventSegment) => void;
	onDragPreview?: (event: DragEvent, segment: EventSegment) => void;
	setResizeRefOnDragStart?: boolean;
	clearResizeRefOnDragEnd?: boolean;
	buildResizeCommitEntries?: (
		segment: EventSegment,
		hoverDateKey: string | null,
		hoverMinutes: number | null,
	) => ResizeCommitEntries;
	shouldCommitResize?: (entries: ResizeCommitEntries) => boolean;
	clearDragStateAfterDrop?: boolean;
};

export type UseTimedGridEventInteractionsResult = {
	timeGridRef: { current: HTMLDivElement | null };
	timedResizing: EventSegment | null;
	timedDragging: EventSegment | null;
	timedResizeRange: TimeSelectionRange | null;
	timedDragRange: TimeSelectionRange | null;
	timedResizeColorValue: string;
	timedDragColorValue: string;
	handleTimedResizeStart: (segment: EventSegment, event: PointerEvent) => void;
	handleTimedDragStart: (event: DragEvent, segment: EventSegment) => void;
	handleTimedDragEnd: () => void;
	handleTimedEventDragOver: (event: DragEvent) => void;
	handleTimedEventDrop: (event: DragEvent) => void;
};

export const buildDefaultResizeCommitEntries = (
	segment: EventSegment,
	hoverDateKey: string | null,
	hoverMinutes: number | null,
): ResizeCommitEntries => {
	const nextEvent = buildTimedResizeEvent(segment, hoverDateKey, hoverMinutes);
	const previous: EditableEventResponse = [segment.event, segment.location];
	const next: EditableEventResponse = [nextEvent, segment.location];
	return { next, previous };
};

const shouldAlwaysCommit = () => true;

export const useTimedGridEventInteractions = ({
	defaultEventColor,
	isResizingRef,
	onSaveEvent,
	onMoveEvent,
	resolvePointerState,
	resolveDragOverState,
	canDragSegment = () => true,
	onDragStart,
	onDragPreview,
	setResizeRefOnDragStart = false,
	clearResizeRefOnDragEnd = false,
	buildResizeCommitEntries = buildDefaultResizeCommitEntries,
	shouldCommitResize = shouldAlwaysCommit,
	clearDragStateAfterDrop = false,
}: UseTimedGridEventInteractionsParams): UseTimedGridEventInteractionsResult => {
	const [timedResizing, setTimedResizing] = useState<EventSegment | null>(null);
	const [timedResizeHoverDateKey, setTimedResizeHoverDateKey] = useState<string | null>(null);
	const [timedResizeHoverMinutes, setTimedResizeHoverMinutes] = useState<number | null>(null);
	const [timedResizeColor, setTimedResizeColor] = useState<string | null>(null);
	const [timedDragging, setTimedDragging] = useState<EventSegment | null>(null);
	const [timedDragHoverDateKey, setTimedDragHoverDateKey] = useState<string | null>(null);
	const [timedDragHoverMinutes, setTimedDragHoverMinutes] = useState<number | null>(null);
	const [timedDragColor, setTimedDragColor] = useState<string | null>(null);
	const timedDidDropRef = useRef(false);
	const timeGridRef = useRef<HTMLDivElement | null>(null);

	const clearDragState = () => {
		setTimedDragging(null);
		setTimedDragHoverDateKey(null);
		setTimedDragHoverMinutes(null);
		setTimedDragColor(null);
	};

	const resolvePointerFromGrid = (
		clientX: number,
		clientY: number,
		gridElement: HTMLDivElement | null,
	): TimedPointerState | null => {
		if (!gridElement) return null;
		return resolvePointerState({ clientX, clientY, gridElement });
	};
	const resolveDragPointerState = (event: DragEvent): TimedPointerState | null => {
		const gridElement = (event.currentTarget as HTMLDivElement | null) ?? timeGridRef.current;
		if (!gridElement) return null;
		return resolveDragOverState
			? resolveDragOverState({ event, gridElement })
			: resolvePointerFromGrid(event.clientX, event.clientY, gridElement);
	};

	const handleTimedResizeStart = (segment: EventSegment, event: PointerEvent) => {
		event.stopPropagation();
		event.preventDefault();
		isResizingRef.current = true;
		const nextState = deriveTimedResizeStartState(segment);
		setTimedResizing(segment);
		setTimedResizeHoverDateKey(nextState.hoverDateKey);
		setTimedResizeHoverMinutes(nextState.hoverMinutes);
		setTimedResizeColor(nextState.color);
		const target = event.currentTarget as HTMLElement | null;
		if (target) {
			target.setPointerCapture(event.pointerId);
		}
	};

	useEffect(() => {
		if (!timedResizing) return;
		const handlePointerMove = (event: PointerEvent) => {
			const next = resolvePointerFromGrid(event.clientX, event.clientY, timeGridRef.current);
			if (!next) return;
			setTimedResizeHoverDateKey(next.dateKey);
			setTimedResizeHoverMinutes(next.minutes);
		};
		const handlePointerUp = () => {
			const entries = buildResizeCommitEntries(
				timedResizing,
				timedResizeHoverDateKey,
				timedResizeHoverMinutes,
			);
			if (shouldCommitResize(entries)) {
				void onSaveEvent(entries.next, entries.previous);
			}
			setTimedResizing(null);
			setTimedResizeHoverDateKey(null);
			setTimedResizeHoverMinutes(null);
			setTimedResizeColor(null);
			window.setTimeout(() => {
				isResizingRef.current = false;
			}, 0);
		};
		return registerWindowPointerMoveAndUp(handlePointerMove, handlePointerUp);
	}, [
		buildResizeCommitEntries,
		isResizingRef,
		onSaveEvent,
		shouldCommitResize,
		timedResizing,
		timedResizeHoverDateKey,
		timedResizeHoverMinutes,
	]);

	const handleTimedDragStart = (event: DragEvent, segment: EventSegment) => {
		event.stopPropagation();
		if (!canDragSegment(segment)) return;
		if (setResizeRefOnDragStart) {
			isResizingRef.current = true;
		}
		onDragStart?.(event, segment);
		const nextState = deriveTimedDragStartState(segment);
		setTimedDragging(segment);
		setTimedDragHoverDateKey(nextState.hoverDateKey);
		setTimedDragHoverMinutes(nextState.hoverMinutes);
		setTimedDragColor(nextState.color);
		onDragPreview?.(event, segment);
	};

	const handleTimedDragEnd = () => {
		if (timedDidDropRef.current) {
			timedDidDropRef.current = false;
		}
		clearDragState();
		if (clearResizeRefOnDragEnd) {
			isResizingRef.current = false;
		}
	};

	const handleTimedEventDragOver = (event: DragEvent) => {
		if (!timedDragging) return;
		event.preventDefault();
		const next = resolveDragPointerState(event);
		if (!next) return;
		setTimedDragHoverDateKey(next.dateKey);
		setTimedDragHoverMinutes(next.minutes);
	};

	const handleTimedEventDrop = (event: DragEvent) => {
		if (!timedDragging) return;
		event.preventDefault();
		const next = resolveDragPointerState(event);
		if (!next) return;
		timedDidDropRef.current = true;
		const previous: EditableEventResponse = [timedDragging.event, timedDragging.location];
		const updatedEvent = buildTimedDragDropEvent(timedDragging, next.dateKey, next.minutes);
		void onMoveEvent([updatedEvent, timedDragging.location], previous);
		if (clearDragStateAfterDrop) {
			clearDragState();
		}
	};

	useEffect(() => {
		if (!clearDragStateAfterDrop || !timedDidDropRef.current) return;
		timedDidDropRef.current = false;
		clearDragState();
		if (clearResizeRefOnDragEnd) {
			isResizingRef.current = false;
		}
	}, [clearDragStateAfterDrop, clearResizeRefOnDragEnd, isResizingRef, timedDragging]);

	const timedResizeRange = useMemo(
		() => deriveTimedResizeRange(timedResizing, timedResizeHoverDateKey, timedResizeHoverMinutes),
		[timedResizing, timedResizeHoverDateKey, timedResizeHoverMinutes],
	);
	const timedDragRange = useMemo(
		() => deriveTimedDragRange(timedDragging, timedDragHoverDateKey, timedDragHoverMinutes),
		[timedDragging, timedDragHoverDateKey, timedDragHoverMinutes],
	);
	const timedResizeColorValue = resolveTimedColor(
		timedResizeColor,
		timedResizing,
		defaultEventColor,
	);
	const timedDragColorValue = resolveTimedColor(timedDragColor, timedDragging, defaultEventColor);

	return {
		timeGridRef,
		timedResizing,
		timedDragging,
		timedResizeRange,
		timedDragRange,
		timedResizeColorValue,
		timedDragColorValue,
		handleTimedResizeStart,
		handleTimedDragStart,
		handleTimedDragEnd,
		handleTimedEventDragOver,
		handleTimedEventDrop,
	};
};
