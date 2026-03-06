import {
	DEFAULT_EVENT_COLOR,
	formatDateKey,
	formatTime,
	isToday,
	normalizeEventColor,
} from '../../shared/event/model-utils';
import { DayAllDaySection } from '../_components/day-week/DayAllDaySection';
import { DayHeader } from '../_components/day-week/DayHeader';
import { DayTimeGrid } from '../_components/day-week/DayTimeGrid';
import { WeekAllDaySection } from '../_components/day-week/WeekAllDaySection';
import { WeekHeader } from '../_components/day-week/WeekHeader';
import { WeekTimeGrid } from '../_components/day-week/WeekTimeGrid';
import { SLOT_MINUTES } from '../constants';
import { SLOT_HEIGHT, useDayWeekCalendarController } from '../hooks/use-day-week-controller';
import type { CalendarViewProps } from '../types';
import type { DayWeekMode } from '../types';
import type { JSX } from 'preact';

type DayWeekCalendarProps = CalendarViewProps & {
	mode: DayWeekMode;
};

export const DayWeekCalendar = (props: DayWeekCalendarProps): JSX.Element => {
	const { mode } = props;
	const controller = useDayWeekCalendarController(props);
	const sharedAllDayInteractionProps = {
		anchorDateKey: controller.selection.anchorDateKey,
		isSelecting: controller.selection.isSelecting,
		draggingId: controller.dragging?.id ?? null,
		onDateClick: controller.handleDateClick,
		onSelectionStart: controller.beginSelection,
		onSelectionHover: controller.updateSelection,
		onDragStart: controller.handleDragStart,
		onDragEnd: controller.handleDragEnd,
		onEventClick: controller.handleEventClick,
		onResizeStart: controller.handleResizeBarStart,
		onToggleCompleted: controller.handleToggleCompleted,
		onDragOverCapture: controller.handleDragOverCapture,
		onDragEnterCapture: controller.handleDragEnterCapture,
		onDropCapture: controller.handleDropCapture,
		gridRef: controller.gridRef,
	};
	const sharedTimedGridProps = {
		isToday,
		nowTop: controller.nowTop,
		showNowIndicator: controller.showNowIndicator,
		onEventClick: controller.handleEventClick,
		onToggleCompleted: controller.handleToggleCompleted,
		formatDateKey,
		formatTime,
		DEFAULT_EVENT_COLOR,
		SLOT_HEIGHT,
		SLOT_MINUTES,
		timeGridHeight: controller.timeGridHeight,
		selectionRange: controller.timeSelectionRange,
		onTimeGridPointerDown: controller.handleTimeGridPointerDown,
		onTimeGridPointerMove: controller.handleTimeGridPointerMove,
		onTimedResizeStart: controller.handleTimedResizeStart,
		timedResizingId: controller.timedResizing?.id ?? null,
		timedDraggingId: controller.timedDragging?.id ?? null,
		onTimedEventDragStart: controller.handleTimedDragStart,
		onTimedEventDragEnd: controller.handleTimedDragEnd,
		onTimedEventDragOver: controller.handleTimedEventDragOver,
		onTimedEventDrop: controller.handleTimedEventDrop,
		timeGridRef: controller.timeGridRef,
		timedResizeRange: controller.timedResizeRange,
		timedResizeColor: controller.timedResizeColorValue,
		timedDragRange: controller.timedDragRange,
		timedDragColor: controller.timedDragColorValue,
		normalizeEventColor,
	};

	return (
		<div className="flex h-full w-full flex-col overflow-x-hidden">
			<div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto outline outline-1 outline-offset-[-1px] outline-[color:var(--background-modifier-border)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-track]:bg-transparent">
				<div className="sticky top-0 z-60 bg-[var(--background-primary)]">
					{mode === 'day' ? (
						<DayHeader date={controller.firstCell.date} isToday={isToday} />
					) : (
						<WeekHeader weekCells={controller.grid} isToday={isToday} />
					)}
					{mode === 'day' ? (
						<DayAllDaySection
							dayCell={controller.gridByIndex[0]!}
							eventRows={controller.eventRows}
							dragRange={controller.dragRange}
							resizeRange={controller.resizeRange}
							dragHoverIndex={controller.dragHoverIndex}
							draggingColor={controller.dragging?.event.color}
							resizingColor={controller.allDayResizing?.event.color}
							selectionSpan={controller.selectionSpan}
							DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
							normalizeEventColor={normalizeEventColor}
							{...sharedAllDayInteractionProps}
						/>
					) : (
						<WeekAllDaySection
							weekCells={controller.gridByIndex}
							eventRows={controller.eventRows}
							dragRange={controller.dragRange}
							resizeRange={controller.resizeRange}
							dragHoverIndex={controller.dragHoverIndex}
							indexByDateKey={controller.indexByDateKey}
							gridByIndex={controller.gridByIndex}
							draggingColor={controller.dragging?.event.color}
							resizingColor={controller.allDayResizing?.event.color}
							selectionSpan={controller.selectionSpan}
							DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
							normalizeEventColor={normalizeEventColor}
							{...sharedAllDayInteractionProps}
						/>
					)}
				</div>
				{mode === 'day' ? (
					<DayTimeGrid
						date={controller.firstCell.date}
						timedEvents={controller.timedEvents}
						{...sharedTimedGridProps}
					/>
				) : (
					<WeekTimeGrid
						weekCells={controller.grid}
						timedEvents={controller.timedEvents}
						todayIndex={controller.todayIndex}
						{...sharedTimedGridProps}
					/>
				)}
			</div>
		</div>
	);
};
