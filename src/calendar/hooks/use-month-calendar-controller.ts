import { useSyncedCurrentDate } from '../../shared/hooks/use-date-sync';
import {
	buildEventRowsWithLocations,
	deriveGridByIndex,
	deriveIndexByDateKey,
} from '../services/interaction/grid';
import { getDateKeyFromPointerFactory } from '../services/interaction/pointer';
import type { MonthCalendarProps } from '../types';
import { buildMonthGrid } from '../utils/date-grid';
import { EVENT_ROW_SPACING } from '../utils/month-calendar-utils';
import { buildMoreMenuEvents } from '../utils/more-menu-events';
import { getGridRowCapacity } from '../utils/row-capacity';
import { useAllDayEventInteractions } from './use-all-day-event-interactions';
import {
	useCalendarInteractionHandlers,
	useCalendarModalState,
	useCalendarMoreMenuState,
} from './use-calendar-interaction-handlers';
import { useCalendarSelections } from './use-calendar-selections';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

const MONTH_POINTER_SLOT_HEIGHT = 36;

export const useMonthCalendarController = ({
	app,
	events,
	onOpenNote,
	onSaveEvent,
	onDeleteEvent,
	onMoveEvent,
	onCreateEvent,
	initialDate,
	onDateChange,
}: MonthCalendarProps) => {
	const { currentDate } = useSyncedCurrentDate(initialDate, onDateChange);
	const modalState = useCalendarModalState();
	const moreMenuState = useCalendarMoreMenuState();
	const [gridHeight, setGridHeight] = useState<number | null>(null);
	const dayGridRef = useRef<HTMLDivElement | null>(null);
	const popoverDragRef = useRef(false);
	const isResizingRef = useRef(false);

	const grid = useMemo(
		() => buildMonthGrid(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
		[currentDate],
	);
	const gridByIndex = useMemo(() => deriveGridByIndex(grid), [grid]);
	const indexByDateKey = useMemo(() => deriveIndexByDateKey(gridByIndex), [gridByIndex]);

	useEffect(() => {
		const element = dayGridRef.current;
		if (!element) return;
		const updateHeight = () => {
			const next = element.clientHeight;
			setGridHeight(next > 0 ? next : null);
		};
		updateHeight();
		const observer = new ResizeObserver(updateHeight);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	const gridRowCapacity = useMemo(
		() => getGridRowCapacity(gridHeight, 6, MONTH_POINTER_SLOT_HEIGHT, EVENT_ROW_SPACING),
		[gridHeight],
	);
	const eventRows = useMemo(() => buildEventRowsWithLocations(events, grid), [events, grid]);
	const getDateKeyFromPointer = getDateKeyFromPointerFactory(dayGridRef, gridByIndex);
	const dateKeys = useMemo(() => gridByIndex.map((cell) => cell.key), [gridByIndex]);

	const {
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
	} = useAllDayEventInteractions({
		getDateKeyFromPointer,
		indexByDateKey,
		onMoveEvent,
		onSaveEvent,
		isResizingRef,
		popoverDragRef,
	});

	const { selection, selectionRange, beginSelection, updateSelection, endSelection } =
		useCalendarSelections({
			indexByDateKey,
			dateKeys,
			slotHeight: MONTH_POINTER_SLOT_HEIGHT,
			setCreateModal: modalState.setCreateModal,
			isSelectionBlocked: Boolean(dragging || allDayResizing),
		});

	const { handleDateClick, handleEventClick, handleToggleCompleted } =
		useCalendarInteractionHandlers({
			app,
			modal: modalState.modal,
			setModal: modalState.setModal,
			createModal: modalState.createModal,
			setCreateModal: modalState.setCreateModal,
			dateClick: {
				moreMenu: moreMenuState.moreMenu,
				setMoreMenu: moreMenuState.setMoreMenu,
				dragging,
				popoverDragRef,
			},
			selectionIsSelecting: selection.isSelecting,
			endSelection,
			isResizingRef,
			onSaveEvent,
			onCreateEvent,
			onDeleteEvent,
			onOpenNote,
		});

	const moreMenuEvents = useMemo(
		() => buildMoreMenuEvents({ eventRows, indexByDateKey, moreMenu: moreMenuState.moreMenu }),
		[eventRows, indexByDateKey, moreMenuState.moreMenu],
	);

	return {
		dayGridRef,
		gridByIndex,
		gridRowCapacity,
		selection,
		selectionRange,
		eventRows,
		indexByDateKey,
		dragRange,
		resizeRange,
		dragHoverIndex,
		dragging,
		resizing: allDayResizing,
		moreMenu: moreMenuState.moreMenu,
		moreMenuEvents,
		beginSelection,
		updateSelection,
		handleDateClick,
		handleDragStart,
		handleDragEnd,
		handleResizeBarStart,
		handleEventClick,
		handleToggleCompleted,
		handleCloseMoreMenu: moreMenuState.handleCloseMoreMenu,
		beginDragFromPopover,
		setMoreMenu: moreMenuState.setMoreMenu,
		handleDragOverCapture,
		handleDragEnterCapture,
		handleDropCapture,
	};
};
