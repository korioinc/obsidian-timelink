import { buildTimedDayEntries, getShiftedTimedRange } from '../utils/timed-events-grid';
import { DayAllDaySection } from './_components/DayAllDaySection';
import { DayHeader } from './_components/DayHeader';
import { DayTimeGrid } from './_components/DayTimeGrid';
import type { EditableEventResponse } from './calendar';
import { canMoveEvent } from './event-sync';
import {
	createDragCaptureHandlers,
	buildEventRowsWithLocations,
	createResizeEffectHandlers,
	createSelectionHandlers,
	createSelectionPointerUpHandler,
	deriveDragAndResizeState,
	deriveGridByIndex,
	deriveIndexByDateKey,
	deriveSelectionRange,
	EMPTY_SELECTION,
	handleCreateSaveFactory,
	handleDateClickFactory,
	handleDragEndFactory,
	handleDragStartFactory,
	handleDropFactory,
	handleEventClickFactory,
	handleModalSaveFactory,
	handleResizeStartFactory,
	handleToggleCompletedFactory,
	isSelectionActive,
} from './events';
import { createDragImage } from './events/drag';
import type {
	CalendarViewProps,
	CreateEventState,
	EventModalState,
	EventSegment,
	TimeSelectionState,
} from './types';
import { useCalendarModals } from './ui';
import { isToday } from './utils/date-grid';
import { getSelectionSpanForWeek } from './utils/event-layout';
import {
	clampEventDate,
	DEFAULT_EVENT_COLOR,
	diffInDays,
	formatDateKey,
	normalizeEventColor,
	parseDateKey,
} from './utils/month-calendar-utils';
import {
	getMinutesFromPointer,
	getMinutesFromY,
	normalizeEndDate,
	normalizeTimeSelection,
	snapMinutes,
} from './utils/time-selection';
import { MINUTES_IN_DAY, SLOT_MINUTES, formatTime, toMinutes } from './utils/week-timed-events';
import { Notice } from 'obsidian';
import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

const SLOT_COUNT = MINUTES_IN_DAY / SLOT_MINUTES;
const SLOT_HEIGHT = 28;

export const DayCalendar = ({
	app,
	events,
	onOpenNote,
	onSaveEvent,
	onDeleteEvent,
	onMoveEvent,
	onCreateEvent,
	initialDate,
	onDateChange,
}: CalendarViewProps): JSX.Element => {
	const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date());
	const currentDateRef = useRef(currentDate);
	const initialDateKeyRef = useRef(initialDate?.getTime() ?? null);
	const timeGridHeight = `${SLOT_COUNT * SLOT_HEIGHT}px`;
	const [modal, setModal] = useState<EventModalState | null>(null);
	const [dragging, setDragging] = useState<EventSegment | null>(null);
	const [dragHoverDateKey, setDragHoverDateKey] = useState<string | null>(null);
	const [allDayResizing, setAllDayResizing] = useState<EventSegment | null>(null);
	const [allDayResizeHoverDateKey, setAllDayResizeHoverDateKey] = useState<string | null>(null);
	const [timedResizing, setTimedResizing] = useState<EventSegment | null>(null);
	const [timedResizeHoverDateKey, setTimedResizeHoverDateKey] = useState<string | null>(null);
	const [timedResizeHoverMinutes, setTimedResizeHoverMinutes] = useState<number | null>(null);
	const [timedResizeColor, setTimedResizeColor] = useState<string | null>(null);
	const [timedDragging, setTimedDragging] = useState<EventSegment | null>(null);
	const [timedDragHoverDateKey, setTimedDragHoverDateKey] = useState<string | null>(null);
	const [timedDragHoverMinutes, setTimedDragHoverMinutes] = useState<number | null>(null);
	const [timedDragColor, setTimedDragColor] = useState<string | null>(null);
	const timedDidDropRef = useRef(false);
	const [now, setNow] = useState(() => new Date());
	const isResizingRef = useRef(false);
	const didDropRef = useRef(false);
	const [selection, setSelection] = useState(() => EMPTY_SELECTION);
	const [timeSelection, setTimeSelection] = useState<TimeSelectionState>({
		isSelecting: false,
		anchorDateKey: null,
		anchorMinutes: null,
		hoverDateKey: null,
		hoverMinutes: null,
	});
	const [createModal, setCreateModal] = useState<CreateEventState | null>(null);
	const [moreMenu, setMoreMenu] = useState<{ dateKey: string } | null>(null);
	const dayGridRef = useRef<HTMLDivElement | null>(null);
	const popoverDragRef = useRef(false);

	const { beginSelection, updateSelection, endSelection } = createSelectionHandlers(setSelection);
	const isSelecting = useMemo(() => isSelectionActive(selection), [selection]);

	useEffect(() => {
		if (!isSelecting) return;
		const handlePointerUp = createSelectionPointerUpHandler(
			() => selection,
			setCreateModal,
			endSelection,
		);
		window.addEventListener('pointerup', handlePointerUp);
		return () => window.removeEventListener('pointerup', handlePointerUp);
	}, [endSelection, isSelecting, selection]);

	const dayCell = useMemo(
		() => ({
			date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
			inMonth: true,
		}),
		[currentDate],
	);
	const dayGrid = useMemo(() => [dayCell], [dayCell]);
	const gridByIndex = useMemo(() => deriveGridByIndex(dayGrid), [dayGrid]);
	const indexByDateKey = useMemo(() => deriveIndexByDateKey(gridByIndex), [gridByIndex]);
	const dayKey = useMemo(() => formatDateKey(dayCell.date), [dayCell.date]);

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

	const eventRows = useMemo(() => buildEventRowsWithLocations(events, dayGrid), [events, dayGrid]);

	const eventRowsVersion = useMemo(
		() =>
			eventRows
				.flat()
				.map((segment) => segment.id)
				.join('|'),
		[eventRows],
	);

	const notice = (message: string) => {
		new Notice(message);
	};

	useEffect(() => {
		if (!timeSelection.isSelecting) return;
		const handlePointerUp = () => {
			const range = normalizeTimeSelection(timeSelection);
			if (range) {
				const startTime = formatTime(range.startMinutes);
				const endTime = formatTime(range.endMinutes);
				setCreateModal({
					title: '',
					startDate: range.startDateKey,
					endDate: range.endDateKey,
					allDay: false,
					taskEvent: false,
					startTime,
					endTime,
					isCompleted: false,
					color: '',
				});
			}
			setTimeSelection({
				isSelecting: false,
				anchorDateKey: null,
				anchorMinutes: null,
				hoverDateKey: null,
				hoverMinutes: null,
			});
		};
		window.addEventListener('pointerup', handlePointerUp, { once: true });
		return () => window.removeEventListener('pointerup', handlePointerUp);
	}, [eventRowsVersion, timeSelection]);

	const handleModalSave = handleModalSaveFactory(() => modal, onSaveEvent, setModal, notice);
	const handleCreateSave = handleCreateSaveFactory(
		() => createModal,
		onCreateEvent,
		setCreateModal,
		notice,
	);
	const handleCloseMoreMenu = () => {
		setMoreMenu(null);
	};

	const handleDateClick = handleDateClickFactory(
		() => moreMenu,
		() => dragging,
		popoverDragRef,
		handleCloseMoreMenu,
		setCreateModal,
	);

	const handleEventClick = handleEventClickFactory(
		(next) => setModal(next),
		endSelection,
		() => selection.isSelecting,
		isResizingRef,
	);

	const handleToggleCompleted = handleToggleCompletedFactory(onSaveEvent);

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

	const handleResizeStart = handleResizeStartFactory(
		setAllDayResizing,
		setAllDayResizeHoverDateKey,
	);

	const getDateKeyFromPointer = (_clientX: number, _clientY: number) => dayKey;

	const handleDragStart = handleDragStartFactory(
		setDragging,
		setDragHoverDateKey,
		didDropRef,
		getDateKeyFromPointer,
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
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp, { once: true });
		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);
		};
	}, [allDayResizing, allDayResizeHoverDateKey, getDateKeyFromPointer, onSaveEvent]);

	const timeGridRef = useRef<HTMLDivElement | null>(null);
	const getTimedResizeState = (event: PointerEvent) => {
		const gridEl = timeGridRef.current;
		if (!gridEl) return null;
		const rect = gridEl.getBoundingClientRect();
		const dateKey = dayKey;
		const minutes = snapMinutes(
			getMinutesFromPointer(event.clientY, rect, SLOT_HEIGHT),
			SLOT_MINUTES,
		);
		return { dateKey, minutes };
	};

	const handleTimedResizeStart = (segment: EventSegment, event: PointerEvent) => {
		event.stopPropagation();
		event.preventDefault();
		isResizingRef.current = true;
		setTimedResizing(segment);
		setTimedResizeHoverDateKey(segment.end);
		setTimedResizeHoverMinutes(toMinutes(segment.event.endTime) ?? null);
		setTimedResizeColor(segment.event.color ?? null);
		const target = event.currentTarget as HTMLElement | null;
		if (target) {
			target.setPointerCapture(event.pointerId);
		}
	};

	useEffect(() => {
		if (!timedResizing) return;
		const handlePointerMove = (event: PointerEvent) => {
			const next = getTimedResizeState(event);
			if (!next) return;
			setTimedResizeHoverDateKey(next.dateKey);
			setTimedResizeHoverMinutes(next.minutes);
		};
		const handlePointerUp = () => {
			const startKey = timedResizing.event.date ?? timedResizing.start;
			const endKey = normalizeEndDate(startKey, timedResizeHoverDateKey ?? startKey);
			const startMinutes = toMinutes(timedResizing.event.startTime) ?? 0;
			const endMinutes = timedResizeHoverMinutes ?? toMinutes(timedResizing.event.endTime) ?? 0;
			const normalizedEndMinutes =
				endKey === startKey ? Math.max(startMinutes, endMinutes) : endMinutes;
			const nextEvent = {
				...timedResizing.event,
				endDate: endKey === startKey ? undefined : endKey,
				endTime: formatTime(normalizedEndMinutes),
				startTime: timedResizing.event.startTime ?? formatTime(startMinutes),
			};
			const previous = [timedResizing.event, timedResizing.location] as EditableEventResponse;
			onSaveEvent([nextEvent, timedResizing.location], previous);
			setTimedResizing(null);
			setTimedResizeHoverDateKey(null);
			setTimedResizeHoverMinutes(null);
			setTimedResizeColor(null);
			window.setTimeout(() => {
				isResizingRef.current = false;
			}, 0);
		};
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp, { once: true });
		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);
		};
	}, [onSaveEvent, timedResizing, timedResizeHoverDateKey, timedResizeHoverMinutes]);

	const handleTimedDragStart = (event: DragEvent, segment: EventSegment) => {
		event.stopPropagation();
		if (!canMoveEvent(segment.event)) return;
		isResizingRef.current = true;
		setTimedDragging(segment);
		setTimedDragHoverDateKey(segment.start);
		setTimedDragHoverMinutes(toMinutes(segment.event.startTime) ?? 0);
		setTimedDragColor(segment.event.color ?? null);
		createDragImage(event, segment);
	};

	const handleTimedDragEnd = () => {
		if (timedDidDropRef.current) {
			timedDidDropRef.current = false;
		}
		setTimedDragging(null);
		setTimedDragHoverDateKey(null);
		setTimedDragHoverMinutes(null);
		setTimedDragColor(null);
		isResizingRef.current = false;
	};

	const getTimedDragState = (event: DragEvent) => {
		const gridEl = timeGridRef.current;
		if (!gridEl) return null;
		const rect = gridEl.getBoundingClientRect();
		const dateKey = dayKey;
		const minutes = snapMinutes(
			getMinutesFromPointer(event.clientY, rect, SLOT_HEIGHT),
			SLOT_MINUTES,
		);
		return { dateKey, minutes };
	};

	const handleTimedEventDragOver = (event: DragEvent) => {
		if (!timedDragging) return;
		event.preventDefault();
		const next = getTimedDragState(event);
		if (!next) return;
		setTimedDragHoverDateKey(next.dateKey);
		setTimedDragHoverMinutes(next.minutes);
	};

	const handleTimedEventDrop = (event: DragEvent) => {
		if (!timedDragging) return;
		event.preventDefault();
		const next = getTimedDragState(event);
		if (!next) return;
		timedDidDropRef.current = true;
		const previous: EditableEventResponse = [timedDragging.event, timedDragging.location];
		const baseDate = timedDragging.event.date ?? timedDragging.start;
		const baseEndKey = timedDragging.event.endDate ?? timedDragging.end ?? baseDate;
		const baseStartMinutes = toMinutes(timedDragging.event.startTime) ?? 0;
		const baseEndMinutes = toMinutes(timedDragging.event.endTime) ?? 0;
		const hoverKey = next.dateKey;
		const hoverMinutes = next.minutes;
		const offsetDays = diffInDays(parseDateKey(baseDate), parseDateKey(hoverKey));
		const { startMinutes, endMinutes, endDateKey } = getShiftedTimedRange({
			baseStartKey: baseDate,
			baseEndKey,
			hoverKey,
			baseStartMinutes,
			baseEndMinutes,
			hoverMinutes,
		});
		const nextEvent = clampEventDate(timedDragging.event, offsetDays);
		const nextEndDate = endDateKey === hoverKey ? hoverKey : endDateKey;
		const updatedEvent = {
			...nextEvent,
			allDay: false,
			date: hoverKey,
			endDate: nextEndDate,
			startTime: formatTime(startMinutes),
			endTime: formatTime(endMinutes),
		};
		onMoveEvent([updatedEvent, timedDragging.location], previous);
	};

	const selectionRange = useMemo(
		() => deriveSelectionRange(selection, indexByDateKey),
		[selection, indexByDateKey],
	);

	const timeSelectionRange = useMemo(() => normalizeTimeSelection(timeSelection), [timeSelection]);
	const timedResizeRange = useMemo(() => {
		if (!timedResizing) return null;
		const startKey = timedResizing.event.date ?? timedResizing.start;
		const endKey = normalizeEndDate(startKey, timedResizeHoverDateKey ?? startKey);
		const startMinutes = toMinutes(timedResizing.event.startTime) ?? 0;
		const endMinutes = timedResizeHoverMinutes ?? toMinutes(timedResizing.event.endTime) ?? 0;
		return {
			startDateKey: startKey,
			endDateKey: endKey,
			startMinutes,
			endMinutes,
		};
	}, [timedResizing, timedResizeHoverDateKey, timedResizeHoverMinutes]);
	const timedResizeColorValue =
		timedResizeColor ?? timedResizing?.event.color ?? DEFAULT_EVENT_COLOR;
	const timedDragRange = useMemo(() => {
		if (!timedDragging) return null;
		const baseStartKey = timedDragging.event.date ?? timedDragging.start;
		const baseEndKey = timedDragging.event.endDate ?? timedDragging.end ?? baseStartKey;
		const baseStartMinutes = toMinutes(timedDragging.event.startTime) ?? 0;
		const baseEndMinutes = toMinutes(timedDragging.event.endTime) ?? 0;
		const hoverKey = timedDragHoverDateKey ?? baseStartKey;
		const hoverMinutes = timedDragHoverMinutes ?? baseStartMinutes;
		const { startMinutes, endMinutes, endDateKey } = getShiftedTimedRange({
			baseStartKey,
			baseEndKey,
			hoverKey,
			baseStartMinutes,
			baseEndMinutes,
			hoverMinutes,
		});
		return {
			startDateKey: hoverKey,
			endDateKey: endDateKey === hoverKey ? hoverKey : endDateKey,
			startMinutes,
			endMinutes,
		};
	}, [timedDragging, timedDragHoverDateKey, timedDragHoverMinutes]);
	const timedDragColorValue = timedDragColor ?? timedDragging?.event.color ?? DEFAULT_EVENT_COLOR;

	useEffect(() => {
		if (currentDate.getTime() === currentDateRef.current.getTime()) return;
		onDateChange?.(currentDate);
		currentDateRef.current = currentDate;
	}, [currentDate, onDateChange]);

	useEffect(() => {
		const nextKey = initialDate?.getTime() ?? null;
		if (nextKey === initialDateKeyRef.current) return;
		initialDateKeyRef.current = nextKey;
		if (!initialDate) return;
		setCurrentDate(initialDate);
	}, [initialDate]);

	useEffect(() => {
		const tick = () => setNow(new Date());
		const intervalId = window.setInterval(tick, 60000);
		return () => window.clearInterval(intervalId);
	}, []);

	const handleModalDelete = () => {
		if (!modal) return;
		onDeleteEvent([modal.segment.event, modal.segment.location]);
		setModal(null);
	};

	const handleOpenNote = () => {
		if (!modal?.segment.location.file.path) {
			new Notice('Unable to find the note path.');
			return;
		}
		onOpenNote(modal.segment.location.file.path);
	};

	const handleCloseEditModal = () => {
		setModal(null);
	};

	const handleCloseCreateModal = () => {
		setCreateModal(null);
	};

	useCalendarModals({
		app,
		modal,
		createModal,
		onEditSave: handleModalSave,
		onEditDelete: handleModalDelete,
		onOpenNote: handleOpenNote,
		onCloseEdit: handleCloseEditModal,
		onCreateSave: handleCreateSave,
		onCloseCreate: handleCloseCreateModal,
	});

	const handleResizeBarStart = (segment: EventSegment) => {
		isResizingRef.current = true;
		handleResizeStart(segment);
	};

	const allDayEventRows = useMemo(() => eventRows, [eventRows]);

	const { handleDragOverCapture, handleDragEnterCapture, handleDropCapture } =
		createDragCaptureHandlers(
			() => dragging,
			getDateKeyFromPointer,
			setDragHoverDateKey,
			handleDrop,
		);

	const getTimeSelectionFromPointer = (event: PointerEvent) => {
		const target = event.currentTarget as HTMLDivElement | null;
		if (!target) return null;
		const rect = target.getBoundingClientRect();
		const dateKey = dayKey;
		const minutes = getMinutesFromY(event.clientY, rect.top, SLOT_HEIGHT);
		return { dateKey, minutes, target };
	};

	const handleTimeGridPointerDown = (event: PointerEvent) => {
		if (event.button !== 0) return;
		if (dragging || allDayResizing || timedResizing) return;
		const selectionInfo = getTimeSelectionFromPointer(event);
		if (!selectionInfo) return;
		selectionInfo.target.setPointerCapture(event.pointerId);
		setTimeSelection({
			isSelecting: true,
			anchorDateKey: selectionInfo.dateKey,
			anchorMinutes: selectionInfo.minutes,
			hoverDateKey: selectionInfo.dateKey,
			hoverMinutes: selectionInfo.minutes,
		});
	};

	const handleTimeGridPointerMove = (event: PointerEvent) => {
		if (!timeSelection.isSelecting || !timeSelection.anchorDateKey) return;
		const selectionInfo = getTimeSelectionFromPointer(event);
		if (!selectionInfo) return;
		setTimeSelection((prev) => ({
			...prev,
			hoverDateKey: selectionInfo.dateKey,
			hoverMinutes: selectionInfo.minutes,
		}));
	};

	const timedEventsForDay = useMemo(
		() =>
			buildTimedDayEntries({
				segments: eventRows.flat(),
				dayKey,
				dayOffset: 0,
				timedResizing,
				timedResizeRange,
				timedDragging,
				timedDragRange,
			}).flat(),
		[dayKey, eventRows, timedDragging, timedDragRange, timedResizing, timedResizeRange],
	);

	const showNowIndicator = useMemo(() => isToday(dayCell.date), [dayCell.date, now]);
	const nowMinutes = useMemo(() => now.getHours() * 60 + now.getMinutes(), [now]);
	const nowTop = (nowMinutes / SLOT_MINUTES) * SLOT_HEIGHT;

	return (
		<div className="flex h-full w-full flex-col overflow-x-hidden">
			<div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto outline outline-1 outline-offset-[-1px] outline-[color:var(--background-modifier-border)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-track]:bg-transparent">
				<div className="sticky top-0 z-60 bg-[var(--background-primary)]">
					<DayHeader date={dayCell.date} isToday={isToday} />
					<DayAllDaySection
						dayCell={gridByIndex[0]!}
						eventRows={allDayEventRows}
						anchorDateKey={selection.anchorDateKey}
						isSelecting={selection.isSelecting}
						draggingId={dragging?.id ?? null}
						onDateClick={handleDateClick}
						onSelectionStart={beginSelection}
						onSelectionHover={updateSelection}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
						onEventClick={handleEventClick}
						onResizeStart={handleResizeBarStart}
						onToggleCompleted={handleToggleCompleted}
						dragRange={dragRange}
						resizeRange={resizeRange}
						dragHoverIndex={dragHoverIndex}
						indexByDateKey={indexByDateKey}
						gridByIndex={gridByIndex}
						draggingColor={dragging?.event.color}
						resizingColor={allDayResizing?.event.color}
						selectionSpan={selectionRange ? getSelectionSpanForWeek(selectionRange, 0, 0) : null}
						DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
						normalizeEventColor={normalizeEventColor}
						onDragOverCapture={handleDragOverCapture}
						onDragEnterCapture={handleDragEnterCapture}
						onDropCapture={handleDropCapture}
						gridRef={dayGridRef}
					/>
				</div>
				<DayTimeGrid
					date={dayCell.date}
					timedEvents={timedEventsForDay}
					isToday={isToday}
					nowTop={nowTop}
					showNowIndicator={showNowIndicator}
					onEventClick={handleEventClick}
					onToggleCompleted={handleToggleCompleted}
					formatDateKey={formatDateKey}
					formatTime={formatTime}
					DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
					SLOT_HEIGHT={SLOT_HEIGHT}
					SLOT_MINUTES={SLOT_MINUTES}
					timeGridHeight={timeGridHeight}
					selectionRange={timeSelectionRange}
					onTimeGridPointerDown={handleTimeGridPointerDown}
					onTimeGridPointerMove={handleTimeGridPointerMove}
					onTimedResizeStart={handleTimedResizeStart}
					timedResizingId={timedResizing?.id ?? null}
					timedDraggingId={timedDragging?.id ?? null}
					onTimedEventDragStart={handleTimedDragStart}
					onTimedEventDragEnd={handleTimedDragEnd}
					onTimedEventDragOver={handleTimedEventDragOver}
					onTimedEventDrop={handleTimedEventDrop}
					timeGridRef={timeGridRef}
					timedResizeRange={timedResizeRange}
					timedResizeColor={timedResizeColorValue}
					timedDragRange={timedDragRange}
					timedDragColor={timedDragColorValue}
					normalizeEventColor={normalizeEventColor}
				/>
			</div>
		</div>
	);
};
