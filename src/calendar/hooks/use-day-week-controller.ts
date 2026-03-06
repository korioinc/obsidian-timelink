import { DEFAULT_EVENT_COLOR, MINUTES_IN_DAY, isToday } from '../../shared/event/model-utils';
import { useSyncedCurrentDate } from '../../shared/hooks/use-date-sync';
import { useMinuteTicker } from '../../shared/hooks/use-minute-ticker';
import { SLOT_MINUTES } from '../constants';
import { buildEventRowsWithLocations } from '../services/interaction/grid';
import type { CalendarViewProps } from '../types';
import {
	deriveSelectionEndIndexForMode,
	deriveTimedDatesForMode,
	type DayWeekMode,
} from '../types';
import {
	buildTimedPlacementsForDays,
	deriveNowIndicator,
	deriveTimedPlacementDays,
} from '../utils/day-week-grid';
import { getSelectionSpanForWeek } from '../utils/week-event-layout';
import { useAllDayEventInteractions } from './use-all-day-event-interactions';
import { useCalendarGridData } from './use-calendar-grid-data';
import {
	useCalendarInteractionHandlers,
	useCalendarModalState,
} from './use-calendar-interaction-handlers';
import { useCalendarSelections } from './use-calendar-selections';
import { useTimedEventInteractions } from './use-timed-event-interactions';
import { useMemo, useRef } from 'preact/hooks';

export const SLOT_HEIGHT = 28;
const SLOT_COUNT = MINUTES_IN_DAY / SLOT_MINUTES;

type UseDayWeekCalendarControllerParams = CalendarViewProps & { mode: DayWeekMode };

export const useDayWeekCalendarController = ({
	mode,
	app,
	events,
	onOpenNote,
	onSaveEvent,
	onDeleteEvent,
	onMoveEvent,
	onCreateEvent,
	initialDate,
	onDateChange,
}: UseDayWeekCalendarControllerParams) => {
	const { currentDate } = useSyncedCurrentDate(initialDate, onDateChange);
	const timeGridHeight = `${SLOT_COUNT * SLOT_HEIGHT}px`;
	const modalState = useCalendarModalState();
	const now = useMinuteTicker();
	const isResizingRef = useRef(false);
	const popoverDragRef = useRef(false);

	const { grid, gridByIndex, indexByDateKey, dateKeys, gridRef, getDateKeyFromPointer } =
		useCalendarGridData({
			currentDate,
			view: mode,
			weekStartsOn: 0,
		});
	const firstCell = grid[0]!;

	const eventRows = useMemo(() => buildEventRowsWithLocations(events, grid), [events, grid]);

	const {
		dragging,
		allDayResizing,
		dragRange,
		resizeRange,
		dragHoverIndex,
		handleDragStart,
		handleDragEnd,
		handleResizeBarStart,
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

	const {
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
	} = useTimedEventInteractions({
		dateKeys,
		slotHeight: SLOT_HEIGHT,
		slotMinutes: SLOT_MINUTES,
		onSaveEvent,
		onMoveEvent,
		isResizingRef,
		defaultEventColor: DEFAULT_EVENT_COLOR,
	});

	const {
		selection,
		selectionRange,
		timeSelectionRange,
		beginSelection,
		updateSelection,
		endSelection,
		handleTimeGridPointerDown,
		handleTimeGridPointerMove,
	} = useCalendarSelections({
		indexByDateKey,
		dateKeys,
		slotHeight: SLOT_HEIGHT,
		setCreateModal: modalState.setCreateModal,
		isSelectionBlocked: Boolean(dragging || allDayResizing || timedResizing),
	});

	const { handleDateClick, handleEventClick, handleToggleCompleted } =
		useCalendarInteractionHandlers({
			app,
			modal: modalState.modal,
			setModal: modalState.setModal,
			createModal: modalState.createModal,
			setCreateModal: modalState.setCreateModal,
			selectionIsSelecting: selection.isSelecting,
			endSelection,
			isResizingRef,
			onSaveEvent,
			onCreateEvent,
			onDeleteEvent,
			onOpenNote,
		});

	const timedDates = useMemo(
		() => deriveTimedDatesForMode(mode, grid, firstCell),
		[mode, grid, firstCell.date],
	);

	const timedSegments = useMemo(() => eventRows.flat(), [eventRows]);

	const timedEvents = useMemo(
		() =>
			buildTimedPlacementsForDays({
				days: deriveTimedPlacementDays(timedDates),
				segments: timedSegments,
				timedResizing,
				timedResizeRange,
				timedDragging,
				timedDragRange,
			}),
		[timedDates, timedSegments, timedResizing, timedResizeRange, timedDragging, timedDragRange],
	);

	const { todayIndex, showNowIndicator, nowTop } = useMemo(
		() =>
			deriveNowIndicator({
				dates: timedDates,
				isToday,
				now,
				slotMinutes: SLOT_MINUTES,
				slotHeight: SLOT_HEIGHT,
			}),
		[timedDates, now],
	);

	const selectionSpan = useMemo(
		() => getSelectionSpanForWeek(selectionRange, 0, deriveSelectionEndIndexForMode(mode)),
		[mode, selectionRange],
	);

	return {
		grid,
		gridByIndex,
		indexByDateKey,
		gridRef,
		firstCell,
		eventRows,
		dragging,
		allDayResizing,
		dragRange,
		resizeRange,
		dragHoverIndex,
		handleDragStart,
		handleDragEnd,
		handleResizeBarStart,
		handleDragOverCapture,
		handleDragEnterCapture,
		handleDropCapture,
		selection,
		selectionSpan,
		timeSelectionRange,
		beginSelection,
		updateSelection,
		handleDateClick,
		handleEventClick,
		handleToggleCompleted,
		timedEvents,
		todayIndex,
		showNowIndicator,
		nowTop,
		timeGridHeight,
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
		handleTimeGridPointerDown,
		handleTimeGridPointerMove,
	};
};
