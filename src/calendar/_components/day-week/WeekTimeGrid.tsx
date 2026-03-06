import { canMoveEvent } from '../../../shared/event/event-sync';
import { compareDateKey } from '../../../shared/event/model-utils';
import { MINUTES_IN_DAY, toMinutes } from '../../../shared/event/model-utils';
import { deriveTimedEventVisualState } from '../../../shared/event/timed-visual-model';
import { TimeGridOverlayLayers } from '../../../shared/time-grid/TimeGridOverlayLayers';
import { TimedEventCard } from '../../../shared/time-grid/TimedEventCard';
import { TimedGridFrame } from '../../../shared/time-grid/TimedGridFrame';
import {
	normalizeDateRangeKeys,
	resolveRangeBounds,
} from '../../../shared/time-grid/overlay-range';
import { buildBoundedRangeSegments } from '../../../shared/time-grid/overlay-segments';
import type { WeekTimeGridProps } from '../../types';
import { DayColumnCell } from './DayColumnCell';
import {
	CALENDAR_TIMED_GRID_AXIS_CLASS_NAME,
	CALENDAR_TIMED_GRID_GRID_CLASS_NAME,
	CALENDAR_TIMED_GRID_OUTER_CLASS_NAME,
	renderCalendarTimedGridAxisLabels,
	renderCalendarTimedGridBackground,
} from './timed-grid-preset';

export const WeekTimeGrid = ({
	weekCells,
	timedEvents,
	isToday,
	nowTop,
	todayIndex,
	showNowIndicator,
	onEventClick,
	onToggleCompleted,
	formatDateKey,
	formatTime,
	DEFAULT_EVENT_COLOR,
	SLOT_HEIGHT,
	SLOT_MINUTES,
	timeGridHeight,
	selectionRange,
	onTimeGridPointerDown,
	onTimeGridPointerMove,
	onTimedResizeStart,
	timedResizingId,
	timedDraggingId,
	onTimedEventDragStart,
	onTimedEventDragEnd,
	onTimedEventDragOver,
	onTimedEventDrop,
	timeGridRef,
	timedResizeRange,
	timedResizeColor,
	timedDragRange,
	timedDragColor,
	normalizeEventColor,
}: WeekTimeGridProps) => {
	const todayColumnWidth = 100 / 7;
	const dateKeys = weekCells.map((cell) => formatDateKey(cell.date));
	const selectionBounds = selectionRange
		? resolveRangeBounds(dateKeys, selectionRange.startDateKey, selectionRange.endDateKey)
		: null;
	const selectionSegments = buildBoundedRangeSegments(selectionBounds, selectionRange);
	const resizeRangeKeys = timedResizeRange
		? normalizeDateRangeKeys(timedResizeRange.startDateKey, timedResizeRange.endDateKey)
		: null;
	const resizeColor = normalizeEventColor(timedResizeColor) ?? DEFAULT_EVENT_COLOR;
	const timedDragBounds = timedDragRange
		? resolveRangeBounds(dateKeys, timedDragRange.startDateKey, timedDragRange.endDateKey)
		: null;
	const dragRangeKeys = timedDragRange
		? normalizeDateRangeKeys(timedDragRange.startDateKey, timedDragRange.endDateKey)
		: null;
	const timedDragSegments = buildBoundedRangeSegments(timedDragBounds, timedDragRange);
	const dragColor = normalizeEventColor(timedDragColor) ?? DEFAULT_EVENT_COLOR;

	return (
		<TimedGridFrame
			outerClassName={CALENDAR_TIMED_GRID_OUTER_CLASS_NAME}
			axisClassName={CALENDAR_TIMED_GRID_AXIS_CLASS_NAME}
			gridClassName={CALENDAR_TIMED_GRID_GRID_CLASS_NAME}
			timeGridHeight={timeGridHeight}
			showNowIndicator={showNowIndicator}
			nowTop={nowTop}
			timeGridRef={timeGridRef}
			onTimeGridPointerDown={onTimeGridPointerDown}
			onTimeGridPointerMove={onTimeGridPointerMove}
			onTimedEventDragOver={onTimedEventDragOver}
			onTimedEventDrop={onTimedEventDrop}
			renderAxisLabels={() => renderCalendarTimedGridAxisLabels(SLOT_HEIGHT)}
		>
			{renderCalendarTimedGridBackground(7, SLOT_HEIGHT)}
			<TimeGridOverlayLayers
				selectionSegments={selectionSegments}
				timedDragSegments={timedDragSegments}
				columnCount={7}
				slotMinutes={SLOT_MINUTES}
				slotHeight={SLOT_HEIGHT}
				resizeColor={resizeColor}
				dragColor={dragColor}
				showNowIndicator={showNowIndicator}
				nowTop={nowTop}
				nowIndicatorLeft={`calc(${todayColumnWidth * todayIndex}% + 0px)`}
				nowIndicatorWidth={`calc(${todayColumnWidth}% - 0px)`}
			/>
			{weekCells.map((cell) => {
				const today = isToday(cell.date);
				const dateKey = formatDateKey(cell.date);
				return (
					<DayColumnCell
						key={`time-col-${dateKey}`}
						dateKey={dateKey}
						isToday={today}
						isPressed={false}
						className="relative flex-1"
						style={{ height: timeGridHeight }}
					/>
				);
			})}
			{timedEvents.map((placement) => {
				const placementCell = weekCells[placement.dayOffset];
				if (!placementCell) return null;
				const placementDateKey = formatDateKey(placementCell.date);
				const isResizingEvent =
					timedResizingId === placement.segment.id && Boolean(timedResizeRange);
				const isDraggingEvent = timedDraggingId === placement.segment.id;
				if (isResizingEvent && resizeRangeKeys) {
					if (
						compareDateKey(placementDateKey, resizeRangeKeys.startKey) < 0 ||
						compareDateKey(placementDateKey, resizeRangeKeys.endKey) > 0
					) {
						return null;
					}
				}
				const columnWidth = 100 / 7;
				const width = columnWidth / placement.columnCount;
				const left = columnWidth * placement.dayOffset + width * placement.column;
				const draggable = canMoveEvent(placement.segment.event);
				const eventColor =
					normalizeEventColor(placement.segment.event.color) ?? DEFAULT_EVENT_COLOR;
				const eventStartMinutes =
					toMinutes(placement.segment.event.startTime) ?? placement.startMinutes;
				const eventEndMinutes = toMinutes(placement.segment.event.endTime) ?? placement.endMinutes;
				const hasDragRange = isDraggingEvent && Boolean(timedDragRange && timedDragBounds);
				const isInDragRange =
					hasDragRange &&
					dragRangeKeys !== null &&
					compareDateKey(placementDateKey, dragRangeKeys.startKey) >= 0 &&
					compareDateKey(placementDateKey, dragRangeKeys.endKey) <= 0;
				const dragStartMinutes =
					isInDragRange && timedDragRange
						? placementDateKey === dragRangeKeys?.startKey
							? timedDragRange.startMinutes
							: 0
						: null;
				const dragEndMinutes =
					isInDragRange && timedDragRange
						? placementDateKey === dragRangeKeys?.endKey
							? timedDragRange.endMinutes
							: MINUTES_IN_DAY
						: null;
				const visualState = deriveTimedEventVisualState({
					cellDateKey: placementDateKey,
					eventStartMinutes,
					eventEndMinutes,
					placementStartMinutes: placement.startMinutes,
					placementEndMinutes: placement.endMinutes,
					slotMinutes: SLOT_MINUTES,
					slotHeight: SLOT_HEIGHT,
					isDraggingEvent,
					isResizingEvent,
					timedDragStartMinutes: dragStartMinutes,
					timedDragEndMinutes: dragEndMinutes,
					timedResizeRange,
					resizeRangeKeys,
				});
				const startLabel = formatTime(visualState.labelStartMinutes);
				const endLabel = formatTime(visualState.labelEndMinutes);
				return (
					<TimedEventCard
						key={`timed-${placement.segment.id}`}
						placement={placement}
						visualTop={visualState.visualTop}
						visualHeight={visualState.visualHeight}
						left={left}
						width={width}
						eventColor={eventColor}
						isDraggingEvent={isDraggingEvent}
						draggable={draggable}
						startLabel={startLabel}
						endLabel={endLabel}
						onEventClick={onEventClick}
						onToggleCompleted={onToggleCompleted}
						onTimedResizeStart={onTimedResizeStart}
						onTimedEventDragStart={onTimedEventDragStart}
						onTimedEventDragEnd={onTimedEventDragEnd}
					/>
				);
			})}
		</TimedGridFrame>
	);
};
