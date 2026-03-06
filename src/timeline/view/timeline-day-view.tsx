import {
	DEFAULT_EVENT_COLOR,
	MINUTES_IN_DAY,
	formatDateKey,
	formatTime,
	isToday,
	normalizeEventColor,
} from '../../shared/event/model-utils';
import type { CreateEventState, EventModalState } from '../../shared/event/types';
import { useEventInteractionHandlers } from '../../shared/hooks/use-event-interaction-handlers';
import { useMinuteTicker } from '../../shared/hooks/use-minute-ticker';
import { TimelineTimeGrid } from '../_components/TimelineTimeGrid';
import { TimelineUnscheduledTasks } from '../_components/TimelineUnscheduledTasks';
import { TIMELINE_SLOT_HEIGHT, TIMELINE_SLOT_MINUTES } from '../constants';
import { useTimelineTimeSelection } from '../hooks/use-timeline-time-selection';
import { useTimelineTimedInteractions } from '../hooks/use-timeline-timed-interactions';
import { buildTimelineDayModel, buildTimelineTimedVisualModel } from '../services/model-service';
import type { TimelineDayViewProps } from '../types';
import type { JSX } from 'preact';
import { useMemo, useRef, useState } from 'preact/hooks';

const SLOT_COUNT = MINUTES_IN_DAY / TIMELINE_SLOT_MINUTES;

export const TimelineDayView = ({
	app,
	events,
	onOpenNote,
	onSaveEvent,
	onDeleteEvent,
	onMoveEvent,
	onCreateEvent,
	currentDate,
}: TimelineDayViewProps): JSX.Element => {
	const timeGridHeight = `${SLOT_COUNT * TIMELINE_SLOT_HEIGHT}px`;
	const [modal, setModal] = useState<EventModalState | null>(null);
	const [createModal, setCreateModal] = useState<CreateEventState | null>(null);
	const [unscheduledOpen, setUnscheduledOpen] = useState(false);
	const isResizingRef = useRef(false);

	const dayModel = useMemo(() => {
		return buildTimelineDayModel(events, currentDate);
	}, [currentDate, events]);

	const { dayCell, dayKey, eventSegments, unscheduledTasks } = dayModel;

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
	} = useTimelineTimedInteractions({
		dayKey,
		slotHeight: TIMELINE_SLOT_HEIGHT,
		onSaveEvent,
		onMoveEvent,
		isResizingRef,
		defaultEventColor: DEFAULT_EVENT_COLOR,
	});

	const {
		timeSelection,
		timeSelectionRange,
		endSelection,
		handleTimeGridPointerDown,
		handleTimeGridPointerMove,
	} = useTimelineTimeSelection({
		dayKey,
		slotHeight: TIMELINE_SLOT_HEIGHT,
		isSelectionBlocked: Boolean(timedResizing),
		setCreateModal,
	});

	const { handleEventClick, handleToggleCompleted } = useEventInteractionHandlers({
		app,
		modal,
		setModal,
		createModal,
		setCreateModal,
		selectionIsSelecting: timeSelection.isSelecting,
		endSelection,
		isResizingRef,
		onSaveEvent,
		onCreateEvent,
		onDeleteEvent,
		onOpenNote,
	});

	const now = useMinuteTicker();
	const { timedEventsForDay, showNowIndicator, nowTop } = useMemo(() => {
		return buildTimelineTimedVisualModel({
			eventSegments,
			dayKey,
			dayDate: dayCell.date,
			timedResizing,
			timedResizeRange,
			timedDragging,
			timedDragRange,
			now,
			slotMinutes: TIMELINE_SLOT_MINUTES,
			slotHeight: TIMELINE_SLOT_HEIGHT,
		});
	}, [
		dayCell.date,
		dayKey,
		eventSegments,
		now,
		timedDragRange,
		timedDragging,
		timedResizeRange,
		timedResizing,
	]);

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
					SLOT_HEIGHT={TIMELINE_SLOT_HEIGHT}
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
