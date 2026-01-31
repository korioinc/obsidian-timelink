import type { EditableEventResponse } from '../calendar/calendar';
import {
	buildEventRowsWithLocations,
	handleCreateSaveFactory,
	handleEventClickFactory,
	handleModalSaveFactory,
	handleToggleCompletedFactory,
} from '../calendar/events';
import type {
	CalendarViewProps,
	CreateEventState,
	EventModalState,
	EventSegment,
	TimeSelectionRange,
	TimeSelectionState,
} from '../calendar/types';
import { useCalendarModals } from '../calendar/ui';
import { isToday } from '../calendar/utils/date-grid';
import {
	clampEventDate,
	compareDateKey,
	DEFAULT_EVENT_COLOR,
	diffInDays,
	formatDateKey,
	normalizeEventColor,
	parseDateKey,
} from '../calendar/utils/month-calendar-utils';
import { normalizeEndDate } from '../calendar/utils/time-selection';
import { MINUTES_IN_DAY, formatTime, toMinutes } from '../calendar/utils/week-timed-events';
import { buildTimedDayEntries, getShiftedTimedRange } from '../utils/timed-events-grid';
import { TimelineTimeGrid } from './_components/TimelineTimeGrid';
import { TimelineUnscheduledTasks } from './_components/TimelineUnscheduledTasks';
import { Notice } from 'obsidian';
import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

const TIMELINE_SLOT_MINUTES = 10;
const SLOT_COUNT = MINUTES_IN_DAY / TIMELINE_SLOT_MINUTES;
const SLOT_HEIGHT = 14;

const snapToSlot = (minutes: number) => {
	const snapped = Math.floor(minutes / TIMELINE_SLOT_MINUTES) * TIMELINE_SLOT_MINUTES;
	return Math.max(0, Math.min(MINUTES_IN_DAY, snapped));
};

const getTimelineMinutesFromY = (clientY: number, gridTop: number, slotHeight: number) => {
	const relative = Math.max(0, clientY - gridTop);
	const raw = Math.floor(relative / slotHeight) * TIMELINE_SLOT_MINUTES;
	return Math.min(MINUTES_IN_DAY, Math.max(0, raw));
};

const getTimelineMinutesFromPointer = (clientY: number, gridRect: DOMRect, slotHeight: number) => {
	const relative = Math.max(0, clientY - gridRect.top);
	return Math.max(0, Math.min(MINUTES_IN_DAY, (relative / slotHeight) * TIMELINE_SLOT_MINUTES));
};

const getTimeSelectionFromPointer = (event: PointerEvent, dayKey: string, slotHeight: number) => {
	const target = event.currentTarget as HTMLDivElement | null;
	if (!target) return null;
	const rect = target.getBoundingClientRect();
	const raw = getTimelineMinutesFromY(event.clientY, rect.top, slotHeight);
	const minutes = snapToSlot(raw);
	return { dateKey: dayKey, minutes, target };
};

const normalizeTimelineTimeSelection = (state: TimeSelectionState): TimeSelectionRange | null => {
	if (!state.anchorDateKey || state.anchorMinutes === null) return null;
	if (!state.hoverDateKey || state.hoverMinutes === null) return null;
	const startMinutes = Math.min(state.anchorMinutes, state.hoverMinutes);
	const endMinutes = Math.min(
		MINUTES_IN_DAY,
		Math.max(state.anchorMinutes, state.hoverMinutes) + TIMELINE_SLOT_MINUTES,
	);
	return {
		startDateKey: state.anchorDateKey,
		endDateKey: state.hoverDateKey,
		startMinutes,
		endMinutes,
	};
};

export const TimelineDay = ({
	app,
	events,
	onOpenNote,
	onSaveEvent,
	onDeleteEvent,
	onMoveEvent,
	onCreateEvent,
	initialDate,
	onDateChange: _onDateChange,
}: CalendarViewProps): JSX.Element => {
	const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date());
	const timeGridHeight = `${SLOT_COUNT * SLOT_HEIGHT}px`;
	const [modal, setModal] = useState<EventModalState | null>(null);
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
	const [timeSelection, setTimeSelection] = useState<TimeSelectionState>({
		isSelecting: false,
		anchorDateKey: null,
		anchorMinutes: null,
		hoverDateKey: null,
		hoverMinutes: null,
	});
	const [createModal, setCreateModal] = useState<CreateEventState | null>(null);
	const [unscheduledOpen, setUnscheduledOpen] = useState(false);
	const timeGridRef = useRef<HTMLDivElement | null>(null);

	const endSelection = () => {
		setTimeSelection({
			isSelecting: false,
			anchorDateKey: null,
			anchorMinutes: null,
			hoverDateKey: null,
			hoverMinutes: null,
		});
	};
	const isSelecting = () => timeSelection.isSelecting;

	const dayCell = useMemo(
		() => ({
			date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
			inMonth: true,
		}),
		[currentDate],
	);
	const dayGrid = useMemo(() => [dayCell], [dayCell]);
	const dayKey = useMemo(() => formatDateKey(dayCell.date), [dayCell.date]);

	const eventRows = useMemo(() => buildEventRowsWithLocations(events, dayGrid), [events, dayGrid]);
	const unscheduledTasks = useMemo(
		() =>
			eventRows
				.flat()
				.map((segment) => segment)
				.filter((segment) => {
					const event = segment.event;
					const start = event.startTime?.trim() ?? '';
					const end = event.endTime?.trim() ?? '';
					if (start.length !== 0 || end.length !== 0) {
						return false;
					}
					const startCompare = compareDateKey(dayKey, segment.start);
					const endCompare = compareDateKey(dayKey, segment.end);
					const inRange = startCompare >= 0 && endCompare <= 0;
					return inRange;
				}),
		[dayKey, eventRows],
	);

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
			const range = normalizeTimelineTimeSelection(timeSelection);
			if (range) {
				const startTime = formatTime(range.startMinutes);
				const endTime = formatTime(range.endMinutes);
				setCreateModal({
					title: '',
					startDate: range.startDateKey,
					endDate: range.endDateKey,
					allDay: false,
					taskEvent: true,
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
	const handleEventClick = handleEventClickFactory(
		(next) => setModal(next),
		endSelection,
		isSelecting,
		isResizingRef,
	);

	const handleToggleCompleted = handleToggleCompletedFactory(onSaveEvent);

	useEffect(() => {
		if (!initialDate) return;
		setCurrentDate(initialDate);
	}, [initialDate]);

	useEffect(() => {
		if (!timedResizing) return;
		const startKey = timedResizing.event.date ?? timedResizing.start;
		const endKey = normalizeEndDate(startKey, timedResizeHoverDateKey ?? startKey);
		const startMinutes = toMinutes(timedResizing.event.startTime) ?? 0;
		const endMinutes = timedResizeHoverMinutes ?? toMinutes(timedResizing.event.endTime) ?? 0;
		const normalizedEndMinutes =
			endKey === startKey ? Math.max(startMinutes, endMinutes) : endMinutes;
		const nextEvent = {
			...timedResizing.event,
			date: startKey,
			endDate: endKey === startKey ? undefined : endKey,
			startTime: timedResizing.event.startTime ?? formatTime(startMinutes),
			endTime: formatTime(normalizedEndMinutes),
		};
		const previous = [timedResizing.event, timedResizing.location] as EditableEventResponse;
		onSaveEvent([nextEvent, timedResizing.location], previous);
	}, [onSaveEvent, timedResizing, timedResizeHoverDateKey, timedResizeHoverMinutes]);
	const handleTimeGridPointerDown = (event: PointerEvent) => {
		if (event.button !== 0) return;
		if (timedResizing) return;
		const selectionAnchor = getTimeSelectionFromPointer(event, dayKey, SLOT_HEIGHT);
		if (!selectionAnchor) return;
		selectionAnchor.target.setPointerCapture(event.pointerId);
		setTimeSelection({
			isSelecting: true,
			anchorDateKey: selectionAnchor.dateKey,
			anchorMinutes: selectionAnchor.minutes,
			hoverDateKey: selectionAnchor.dateKey,
			hoverMinutes: selectionAnchor.minutes,
		});
	};

	const handleTimeGridPointerMove = (event: PointerEvent) => {
		if (!timeSelection.isSelecting || !timeSelection.anchorDateKey) return;
		const hover = getTimeSelectionFromPointer(event, dayKey, SLOT_HEIGHT);
		if (!hover) return;
		setTimeSelection((prev) => ({
			...prev,
			hoverDateKey: hover.dateKey,
			hoverMinutes: hover.minutes,
		}));
	};

	const handleTimedDragStart = (event: DragEvent, segment: EventSegment) => {
		event.dataTransfer?.setData('text/plain', segment.id);
		setTimedDragging(segment);
		setTimedDragHoverDateKey(segment.event.date ?? segment.start);
		setTimedDragHoverMinutes(toMinutes(segment.event.startTime) ?? 0);
		setTimedDragColor(segment.event.color ?? DEFAULT_EVENT_COLOR);
	};

	const handleTimedDragEnd = () => {
		setTimedDragging(null);
		setTimedDragHoverDateKey(null);
		setTimedDragHoverMinutes(null);
		setTimedDragColor(null);
	};

	const handleTimedEventDragOver = (event: DragEvent | PointerEvent) => {
		if (!timedDragging) return;
		if ('preventDefault' in event) event.preventDefault();
		const hover = getTimeSelectionFromPointer(event as PointerEvent, dayKey, SLOT_HEIGHT);
		if (!hover) return;
		setTimedDragHoverDateKey(hover.dateKey);
		setTimedDragHoverMinutes(hover.minutes);
	};

	const handleTimedEventDrop = (_event: DragEvent) => {
		if (!timedDragging) return;
		timedDidDropRef.current = true;
		const previous: EditableEventResponse = [timedDragging.event, timedDragging.location];
		const baseDate = timedDragging.event.date ?? timedDragging.start;
		const baseEndKey = timedDragging.event.endDate ?? timedDragging.end ?? baseDate;
		const baseStartMinutes = toMinutes(timedDragging.event.startTime) ?? 0;
		const baseEndMinutes = toMinutes(timedDragging.event.endTime) ?? 0;
		const hoverKey = timedDragHoverDateKey ?? baseDate;
		const hoverMinutes = timedDragHoverMinutes ?? baseStartMinutes;
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
			date: hoverKey,
			endDate: nextEndDate,
			startTime: formatTime(startMinutes),
			endTime: formatTime(endMinutes),
		};
		onMoveEvent([updatedEvent, timedDragging.location], previous);
	};

	const handleTimedResizeStart = (segment: EventSegment, _event: PointerEvent) => {
		_event.stopPropagation();
		_event.preventDefault();
		isResizingRef.current = true;
		setTimedResizing(segment);
		setTimedResizeHoverDateKey(segment.end);
		setTimedResizeHoverMinutes(toMinutes(segment.event.endTime) ?? 0);
		setTimedResizeColor(segment.event.color ?? DEFAULT_EVENT_COLOR);
		const target = _event.currentTarget as HTMLElement | null;
		if (target) {
			target.setPointerCapture(_event.pointerId);
		}
	};

	const getTimedResizeState = (event: PointerEvent) => {
		const gridEl = timeGridRef.current;
		if (!gridEl) return null;
		const rect = gridEl.getBoundingClientRect();
		const raw = getTimelineMinutesFromPointer(event.clientY, rect, SLOT_HEIGHT);
		const minutes = snapToSlot(raw);
		return { minutes };
	};

	useEffect(() => {
		if (!timedResizing) return;
		const handlePointerMove = (event: PointerEvent) => {
			const next = getTimedResizeState(event);
			if (!next) return;
			setTimedResizeHoverDateKey(dayKey);
			setTimedResizeHoverMinutes(next.minutes);
		};
		const handlePointerUp = () => {
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
	}, [dayKey, timedResizing]);

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
		if (timedDidDropRef.current) {
			timedDidDropRef.current = false;
			handleTimedDragEnd();
		}
	}, [handleTimedDragEnd]);

	const timeSelectionRange = useMemo(() => {
		if (!timeSelection.isSelecting) return null;
		return normalizeTimelineTimeSelection(timeSelection);
	}, [timeSelection]);

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
			}),
		[dayKey, eventRows, timedDragging, timedDragRange, timedResizing, timedResizeRange],
	);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setNow(new Date());
		}, 60 * 1000);
		return () => window.clearInterval(interval);
	}, []);

	const showNowIndicator = useMemo(() => isToday(dayCell.date), [dayCell.date, now]);
	const nowMinutes = useMemo(() => now.getHours() * 60 + now.getMinutes(), [now]);
	const nowTop = (nowMinutes / TIMELINE_SLOT_MINUTES) * SLOT_HEIGHT;

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

	return (
		<div className="flex h-full w-full flex-col overflow-x-hidden">
			<div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto outline outline-1 outline-offset-[-1px] outline-[color:var(--background-modifier-border)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-track]:bg-transparent">
				<div className="sticky top-0 z-60 bg-[var(--background-primary)]">
					<TimelineUnscheduledTasks
						tasks={unscheduledTasks}
						isOpen={unscheduledOpen}
						onToggle={() => setUnscheduledOpen((current) => !current)}
						onEventClick={handleEventClick}
						onToggleCompleted={handleToggleCompleted}
					/>
				</div>
				<TimelineTimeGrid
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
					SLOT_MINUTES={TIMELINE_SLOT_MINUTES}
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
