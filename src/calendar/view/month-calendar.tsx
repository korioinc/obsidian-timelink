import { DEFAULT_EVENT_COLOR, normalizeEventColor } from '../../shared/event/model-utils';
import { DragOverlay } from '../_components/month/DragOverlay';
import { MorePopover } from '../_components/month/MorePopover';
import { WeekCell } from '../_components/month/WeekCell';
import { useMonthCalendarController } from '../hooks/use-month-calendar-controller';
import type { MonthCalendarProps } from '../types';
import { WEEKDAY_LABELS } from '../utils/month-calendar-utils';
import {
	getRowCapacity,
	getSelectionSpanForWeek,
	getWeekBounds,
	getWeekCells,
} from '../utils/week-event-layout';

export const MonthCalendar = (props: MonthCalendarProps) => {
	const controller = useMonthCalendarController(props);

	return (
		<div
			className="flex h-full w-full flex-col"
			onDragOverCapture={controller.handleDragOverCapture}
			onDropCapture={controller.handleDropCapture}
		>
			<div className="grid grid-cols-7 gap-px">
				{WEEKDAY_LABELS.map((label) => (
					<div
						className="bg-transparent py-2 text-center text-xs font-semibold tracking-[0.26em] text-[color:var(--text-muted)] uppercase"
						key={label}
					>
						{label}
					</div>
				))}
			</div>
			<div
				ref={controller.dayGridRef}
				className="relative grid min-h-[580px] flex-1 grid-rows-6 gap-px"
				onDragOverCapture={controller.handleDragOverCapture}
				onDragEnterCapture={controller.handleDragEnterCapture}
				onDropCapture={controller.handleDropCapture}
			>
				<MorePopover
					moreMenu={controller.moreMenu}
					moreMenuEvents={controller.moreMenuEvents}
					dayGridRef={controller.dayGridRef}
					onClose={controller.handleCloseMoreMenu}
					onEventClick={controller.handleEventClick}
					onDragStartFromPopover={controller.beginDragFromPopover}
					onDragEnd={controller.handleDragEnd}
					onToggleCompleted={controller.handleToggleCompleted}
					DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
					normalizeEventColor={normalizeEventColor}
				/>
				{Array.from({ length: 6 }).map((_, weekIndex) => {
					const { weekStartIndex, weekEndIndex } = getWeekBounds(weekIndex);
					const weekCells = getWeekCells(controller.gridByIndex, weekStartIndex);
					const selectionSpan = getSelectionSpanForWeek(
						controller.selectionRange,
						weekStartIndex,
						weekEndIndex,
					);
					const rowCapacity = getRowCapacity(controller.gridRowCapacity);
					return (
						<div
							className="relative grid h-full min-h-0 grid-cols-1 gap-px"
							key={`week-${weekIndex}`}
						>
							<DragOverlay
								weekIndex={weekIndex}
								dragRange={controller.dragRange}
								resizeRange={controller.resizeRange}
								dragHoverIndex={controller.dragHoverIndex}
								indexByDateKey={controller.indexByDateKey}
								gridByIndex={controller.gridByIndex}
								draggingColor={controller.dragging?.event.color}
								resizingColor={controller.resizing?.event.color}
								selectionSpan={selectionSpan}
								DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
								normalizeEventColor={normalizeEventColor}
							/>
							<div className="relative z-10 h-full min-h-0">
								<WeekCell
									weekStartIndex={weekStartIndex}
									weekEndIndex={weekEndIndex}
									weekCells={weekCells}
									eventRows={controller.eventRows}
									rowCapacity={rowCapacity}
									anchorDateKey={controller.selection.anchorDateKey}
									isSelecting={controller.selection.isSelecting}
									draggingId={controller.dragging?.id ?? null}
									onDateClick={controller.handleDateClick}
									onSelectionStart={controller.beginSelection}
									onSelectionHover={controller.updateSelection}
									onDragStart={controller.handleDragStart}
									onDragEnd={controller.handleDragEnd}
									onEventClick={controller.handleEventClick}
									onResizeStart={controller.handleResizeBarStart}
									onToggleCompleted={controller.handleToggleCompleted}
									onMoreClick={(dateKey) => controller.setMoreMenu({ dateKey })}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
