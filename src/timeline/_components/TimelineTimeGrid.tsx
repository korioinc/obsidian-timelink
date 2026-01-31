import { DayColumnCell } from '../../calendar/_components/DayColumnCell';
import { canMoveEvent } from '../../calendar/event-sync';
import type { EventSegment, TimedEventPlacement, TimeSelectionRange } from '../../calendar/types';
import { compareDateKey } from '../../calendar/utils/month-calendar-utils';
import { MINUTES_IN_DAY, toMinutes } from '../../calendar/utils/week-timed-events';

type TimelineTimeGridProps = {
	date: Date;
	timedEvents: TimedEventPlacement[];
	isToday: (date: Date) => boolean;
	nowTop: number;
	showNowIndicator: boolean;
	onEventClick: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
	formatDateKey: (date: Date) => string;
	formatTime: (minutes: number) => string;
	DEFAULT_EVENT_COLOR: string;
	SLOT_HEIGHT: number;
	SLOT_MINUTES: number;
	timeGridHeight: string;
	selectionRange: TimeSelectionRange | null;
	onTimeGridPointerDown: (event: PointerEvent) => void;
	onTimeGridPointerMove: (event: PointerEvent) => void;
	onTimedResizeStart: (segment: EventSegment, event: PointerEvent) => void;
	timedResizingId?: string | null;
	timedDraggingId?: string | null;
	onTimedEventDragStart: (event: DragEvent, segment: EventSegment) => void;
	onTimedEventDragEnd: () => void;
	onTimedEventDragOver: (event: DragEvent) => void;
	onTimedEventDrop: (event: DragEvent) => void;
	timeGridRef: { current: HTMLDivElement | null };
	timedResizeRange: TimeSelectionRange | null;
	timedResizeColor?: string;
	timedDragRange: TimeSelectionRange | null;
	timedDragColor?: string;
	normalizeEventColor: (color?: string | null) => string | null;
};

const clampMinutes = (value: number) => Math.max(0, Math.min(MINUTES_IN_DAY, value));

export const TimelineTimeGrid = ({
	date,
	timedEvents,
	isToday,
	nowTop,
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
}: TimelineTimeGridProps) => {
	const slotsPerHour = Math.max(1, Math.round(60 / SLOT_MINUTES));
	const hourBlockHeight = SLOT_HEIGHT * slotsPerHour;
	const halfHourHeight = hourBlockHeight / 2;
	const dateKey = formatDateKey(date);
	const today = isToday(date);

	const showSelection = Boolean(selectionRange) && selectionRange?.startDateKey === dateKey;

	const selectionStartMinutes =
		showSelection && selectionRange ? selectionRange.startMinutes : null;
	const selectionEndMinutes = (() => {
		if (!showSelection || !selectionRange) return null;
		if (selectionRange.endDateKey === dateKey) return selectionRange.endMinutes;
		return MINUTES_IN_DAY;
	})();

	const resizeColor = normalizeEventColor(timedResizeColor) ?? DEFAULT_EVENT_COLOR;
	const dragColor = normalizeEventColor(timedDragColor) ?? DEFAULT_EVENT_COLOR;

	const showTimedDrag = Boolean(timedDragRange) && timedDragRange?.startDateKey === dateKey;
	const timedDragEndMinutes =
		showTimedDrag && timedDragRange
			? timedDragRange.endDateKey === dateKey
				? timedDragRange.endMinutes
				: MINUTES_IN_DAY
			: null;

	return (
		<div className="flex">
			<div className="relative z-10 box-border flex w-[20px] shrink-0 flex-col border-t border-r border-l border-[var(--background-modifier-border)] pt-[6px] text-[10px] text-[color:var(--text-muted)]">
				{showNowIndicator ? (
					<div
						className="pointer-events-none absolute top-0 right-0 h-full w-3"
						style={{ height: timeGridHeight, top: `-4px` }}
					>
						<div
							className="absolute ml-[4px] h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-[var(--text-error)]"
							style={{ top: `${nowTop}px` }}
						/>
					</div>
				) : null}
				{Array.from({ length: 24 }).map((_, hour) => (
					<div
						key={`label-${hour}`}
						className="relative"
						style={{ height: `${hourBlockHeight}px` }}
					>
						<span className="absolute -top-[6px] right-1">{String(hour)}</span>
					</div>
				))}
			</div>
			<div className="relative min-h-0 flex-1 overflow-x-hidden">
				<div
					ref={timeGridRef}
					className="relative flex border-t border-r border-[var(--background-modifier-border)]"
					onPointerDown={onTimeGridPointerDown}
					onPointerMove={onTimeGridPointerMove}
					onDragOver={onTimedEventDragOver}
					onDrop={onTimedEventDrop}
				>
					<div
						className="pointer-events-none absolute inset-0 z-0 opacity-60"
						style={{
							backgroundImage: `repeating-linear-gradient(to bottom, var(--background-modifier-border) 0, var(--background-modifier-border) 1px, transparent 1px, transparent ${hourBlockHeight}px)`,
						}}
					/>
					<div className="pointer-events-none absolute inset-0 z-0 opacity-60">
						{Array.from({ length: 24 * 2 - 1 }).map((_, index) => {
							const lineIndex = index + 1;
							if (lineIndex % 2 === 0) {
								return null;
							}
							return (
								<div
									key={`half-hour-${lineIndex}`}
									className="absolute right-0 left-0 border-t border-dashed border-[var(--background-modifier-border)]"
									style={{ top: `${lineIndex * halfHourHeight}px` }}
								/>
							);
						})}
					</div>
					{showSelection && selectionStartMinutes !== null && selectionEndMinutes !== null ? (
						<div className="pointer-events-none absolute inset-0 z-10">
							<div
								className="absolute rounded-sm border"
								style={{
									top: `${(selectionStartMinutes / SLOT_MINUTES) * SLOT_HEIGHT}px`,
									height: `${(Math.max(0, selectionEndMinutes - selectionStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT}px`,
									left: `calc(0% + 2px)`,
									width: `calc(100% - 4px)`,
									borderColor: `color-mix(in srgb, ${resizeColor} 38%, transparent)`,
									backgroundColor: `color-mix(in srgb, ${resizeColor} 10%, transparent)`,
								}}
							/>
						</div>
					) : null}
					{showTimedDrag && timedDragRange ? (
						<div className="pointer-events-none absolute inset-0 z-10">
							<div
								className="absolute rounded-sm border"
								style={{
									top: `${(timedDragRange.startMinutes / SLOT_MINUTES) * SLOT_HEIGHT}px`,
									height: `${(Math.max(0, (timedDragEndMinutes ?? MINUTES_IN_DAY) - timedDragRange.startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT}px`,
									left: `calc(0% + 2px)`,
									width: `calc(100% - 4px)`,
									borderColor: `color-mix(in srgb, ${dragColor} 38%, transparent)`,
									backgroundColor: `color-mix(in srgb, ${dragColor} 10%, transparent)`,
								}}
							/>
						</div>
					) : null}
					{showNowIndicator ? (
						<div className="pointer-events-none absolute inset-0 z-50">
							<div
								className="absolute h-[2px] bg-[var(--text-error)]"
								style={{
									top: `${nowTop}px`,
									left: `calc(0% + 0px)`,
									width: `calc(100% - 0px)`,
								}}
							/>
						</div>
					) : null}
					<DayColumnCell
						key={`time-col-${dateKey}`}
						dateKey={dateKey}
						isToday={today}
						isPressed={false}
						className="relative flex-1"
						style={{ height: timeGridHeight }}
					/>
					{timedEvents.map((placement) => {
						const isResizingEvent =
							timedResizingId === placement.segment.id && Boolean(timedResizeRange);
						const isDraggingEvent = timedDraggingId === placement.segment.id;
						const hasDragRange = isDraggingEvent && showTimedDrag && Boolean(timedDragRange);
						const draggable = canMoveEvent(placement.segment.event);
						const eventColor =
							normalizeEventColor(placement.segment.event.color) ?? DEFAULT_EVENT_COLOR;
						const eventStartMinutes =
							toMinutes(placement.segment.event.startTime) ?? placement.startMinutes;
						const eventEndMinutes =
							toMinutes(placement.segment.event.endTime) ?? placement.endMinutes;
						const dragStartMinutes =
							hasDragRange && timedDragRange ? timedDragRange.startMinutes : null;
						const dragEndMinutes =
							hasDragRange && timedDragRange ? (timedDragEndMinutes ?? MINUTES_IN_DAY) : null;
						const baseLabelStartMinutes = eventStartMinutes;
						const baseLabelEndMinutes = eventEndMinutes;
						const resizeRangeStartKey = timedResizeRange
							? compareDateKey(timedResizeRange.startDateKey, timedResizeRange.endDateKey) <= 0
								? timedResizeRange.startDateKey
								: timedResizeRange.endDateKey
							: null;
						const resizeRangeEndKey = timedResizeRange
							? compareDateKey(timedResizeRange.startDateKey, timedResizeRange.endDateKey) <= 0
								? timedResizeRange.endDateKey
								: timedResizeRange.startDateKey
							: null;
						const labelStartMinutes = dragStartMinutes ?? baseLabelStartMinutes;
						const labelEndMinutes =
							dragEndMinutes ??
							(isResizingEvent && timedResizeRange && resizeRangeEndKey === dateKey
								? timedResizeRange.endMinutes
								: baseLabelEndMinutes);
						const startLabel = formatTime(labelStartMinutes);
						const endLabel = formatTime(labelEndMinutes);
						let visualStartMinutes: number | null = null;
						let visualEndMinutes: number | null = null;
						if (isResizingEvent && timedResizeRange) {
							if (resizeRangeStartKey && resizeRangeEndKey) {
								if (resizeRangeStartKey === resizeRangeEndKey) {
									visualStartMinutes = eventStartMinutes;
									visualEndMinutes = timedResizeRange.endMinutes;
								} else if (dateKey === resizeRangeStartKey) {
									visualStartMinutes = eventStartMinutes;
									visualEndMinutes = MINUTES_IN_DAY;
								} else if (dateKey === resizeRangeEndKey) {
									visualStartMinutes = 0;
									visualEndMinutes = timedResizeRange.endMinutes;
								} else {
									visualStartMinutes = 0;
									visualEndMinutes = MINUTES_IN_DAY;
								}
							}
						} else if (dragStartMinutes !== null && dragEndMinutes !== null) {
							visualStartMinutes = dragStartMinutes;
							visualEndMinutes = dragEndMinutes;
						}
						if (visualStartMinutes !== null && visualEndMinutes !== null) {
							const clampedStart = clampMinutes(visualStartMinutes);
							const clampedEnd = clampMinutes(visualEndMinutes);
							visualStartMinutes = Math.min(clampedStart, clampedEnd);
							visualEndMinutes = Math.max(clampedStart, clampedEnd);
						}
						const duration = placement.endMinutes - placement.startMinutes;
						const visualTop =
							visualStartMinutes !== null && visualEndMinutes !== null
								? (visualStartMinutes / SLOT_MINUTES) * SLOT_HEIGHT
								: (placement.startMinutes / SLOT_MINUTES) * SLOT_HEIGHT;
						const baseHeight =
							visualEndMinutes !== null && visualStartMinutes !== null
								? Math.max(0, (visualEndMinutes - visualStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT
								: (duration / SLOT_MINUTES) * SLOT_HEIGHT;
						const visualHeight = isDraggingEvent ? 40 : baseHeight;
						const width = 100 / Math.max(1, placement.columnCount);
						const left = width * placement.column;
						return (
							<div
								key={`timed-${placement.segment.id}`}
								className={`group absolute z-20 w-full cursor-pointer overflow-hidden rounded-md border text-[11px] font-semibold text-[color:var(--text-on-accent)] ${
									placement.segment.event.completed ? 'opacity-60' : ''
								}`}
								style={{
									top: `${visualTop}px`,
									left: `calc(${left}% + 2px)`,
									width: `calc(${width}% - 4px)`,
									height: `${visualHeight}px`,
									backgroundColor: eventColor,
									borderColor: eventColor,
									overflow: isDraggingEvent ? 'hidden' : undefined,
								}}
								draggable={draggable}
								onPointerDown={(event) => {
									event.stopPropagation();
								}}
								onDragStart={(event) => {
									event.stopPropagation();
									onTimedEventDragStart(event, placement.segment);
								}}
								onDragEnd={(event) => {
									event.stopPropagation();
									onTimedEventDragEnd();
								}}
								onClick={(event) => {
									event.stopPropagation();
									if (event.target instanceof HTMLInputElement) {
										return;
									}
									onEventClick(placement.segment);
								}}
							>
								<div className="flex items-center gap-0.5 px-2 py-1">
									{placement.segment.event.taskEvent ? (
										<input
											type="checkbox"
											checked={Boolean(placement.segment.event.completed)}
											className="m-0 h-[10px] w-[10px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]"
											onPointerDown={(event) => event.stopPropagation()}
											onClick={(event) => event.stopPropagation()}
											onChange={(event) => {
												event.stopPropagation();
												onToggleCompleted(placement.segment);
											}}
										/>
									) : null}
									<span className="text-[10px] opacity-90">
										{startLabel} - {endLabel}
									</span>
								</div>
								<div className="px-2 pb-1 leading-tight">
									<span
										className={`break-words whitespace-normal ${
											placement.segment.event.completed ? 'line-through' : ''
										}`}
									>
										{placement.segment.event.title}
									</span>
								</div>
								<span
									className="absolute right-0 bottom-0 left-0 h-2 cursor-ns-resize"
									onPointerDown={(event) => onTimedResizeStart(placement.segment, event)}
									title="Resize"
								/>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
