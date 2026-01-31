import type { WeekTimeGridProps } from '../types';
import { MINUTES_IN_DAY, toMinutes } from '../utils/week-timed-events';
import { DayColumnCell } from './DayColumnCell';

const compareDateKey = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

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
	const selectionColumnWidth = 100 / 7;
	const hasSelection = Boolean(selectionRange);
	const firstKey = weekCells[0] ? formatDateKey(weekCells[0].date) : '';
	const lastKey = weekCells[6] ? formatDateKey(weekCells[6].date) : '';
	const selectionStartIndex = selectionRange
		? weekCells.findIndex((cell) => formatDateKey(cell.date) === selectionRange.startDateKey)
		: -1;
	const selectionEndIndex = selectionRange
		? weekCells.findIndex((cell) => formatDateKey(cell.date) === selectionRange.endDateKey)
		: -1;
	const selectionBounds = (() => {
		if (!selectionRange || !firstKey || !lastKey) return null;
		const startKey =
			compareDateKey(selectionRange.startDateKey, selectionRange.endDateKey) <= 0
				? selectionRange.startDateKey
				: selectionRange.endDateKey;
		const endKey =
			compareDateKey(selectionRange.startDateKey, selectionRange.endDateKey) <= 0
				? selectionRange.endDateKey
				: selectionRange.startDateKey;
		let startIndex = selectionStartIndex;
		let endIndex = selectionEndIndex;
		if (startIndex < 0) {
			startIndex = compareDateKey(startKey, firstKey) < 0 ? 0 : -1;
		}
		if (endIndex < 0) {
			endIndex = compareDateKey(endKey, lastKey) > 0 ? 6 : -1;
		}
		if (startIndex < 0 || endIndex < 0) return null;
		return {
			startIndex: Math.min(startIndex, endIndex),
			endIndex: Math.max(startIndex, endIndex),
		};
	})();
	const showSelection = hasSelection && Boolean(selectionBounds);
	const resizeRangeKeys = (() => {
		if (!timedResizeRange || !firstKey || !lastKey) return null;
		const startKey =
			compareDateKey(timedResizeRange.startDateKey, timedResizeRange.endDateKey) <= 0
				? timedResizeRange.startDateKey
				: timedResizeRange.endDateKey;
		const endKey =
			compareDateKey(timedResizeRange.startDateKey, timedResizeRange.endDateKey) <= 0
				? timedResizeRange.endDateKey
				: timedResizeRange.startDateKey;
		return { startKey, endKey };
	})();
	const resizeColor = normalizeEventColor(timedResizeColor) ?? DEFAULT_EVENT_COLOR;
	const timedDragBounds = (() => {
		if (!timedDragRange || !firstKey || !lastKey) return null;
		const startKey =
			compareDateKey(timedDragRange.startDateKey, timedDragRange.endDateKey) <= 0
				? timedDragRange.startDateKey
				: timedDragRange.endDateKey;
		const endKey =
			compareDateKey(timedDragRange.startDateKey, timedDragRange.endDateKey) <= 0
				? timedDragRange.endDateKey
				: timedDragRange.startDateKey;
		let startIndex = weekCells.findIndex((cell) => formatDateKey(cell.date) === startKey);
		let endIndex = weekCells.findIndex((cell) => formatDateKey(cell.date) === endKey);
		if (startIndex < 0 && endIndex < 0) {
			const fullyBefore = compareDateKey(endKey, firstKey) < 0;
			const fullyAfter = compareDateKey(startKey, lastKey) > 0;
			return fullyBefore || fullyAfter ? null : { startIndex: 0, endIndex: 6 };
		}
		if (startIndex < 0) {
			startIndex = compareDateKey(startKey, firstKey) < 0 ? 0 : 6;
		}
		if (endIndex < 0) {
			endIndex = compareDateKey(endKey, lastKey) > 0 ? 6 : 0;
		}
		return { startIndex: Math.min(startIndex, endIndex), endIndex: Math.max(startIndex, endIndex) };
	})();
	const showTimedDrag = Boolean(timedDragRange && timedDragBounds);
	const dragColor = normalizeEventColor(timedDragColor) ?? DEFAULT_EVENT_COLOR;

	return (
		<div className="flex border-x border-t border-[var(--background-modifier-border)]">
			<div className="relative z-10 box-border flex w-[56px] shrink-0 flex-col border-r border-[var(--background-modifier-border)] pt-[6px] text-[10px] text-[color:var(--text-muted)]">
				{showNowIndicator ? (
					<div
						className="pointer-events-none absolute right-0 h-full w-3"
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
						style={{ height: `${SLOT_HEIGHT * 2}px` }}
					>
						<span className="absolute -top-[6px] right-2">{`${String(hour).padStart(
							2,
							'0',
						)}:00`}</span>
					</div>
				))}
			</div>
			<div className="relative min-h-0 flex-1 overflow-x-hidden">
				<div
					ref={timeGridRef}
					className="relative flex"
					onPointerDown={onTimeGridPointerDown}
					onPointerMove={onTimeGridPointerMove}
					onDragOver={onTimedEventDragOver}
					onDrop={onTimedEventDrop}
				>
					<div className="pointer-events-none absolute inset-0 z-0 bg-[repeating-linear-gradient(to_bottom,var(--background-modifier-border)_0,var(--background-modifier-border)_1px,transparent_1px,transparent_28px),repeating-linear-gradient(to_right,transparent_0,transparent_calc(100%/7-1px),var(--background-modifier-border)_calc(100%/7-1px),var(--background-modifier-border)_calc(100%/7))]" />
					{showSelection && selectionRange && selectionBounds ? (
						<div className="pointer-events-none absolute inset-0 z-10">
							{Array.from(
								{ length: selectionBounds.endIndex - selectionBounds.startIndex + 1 },
								(_, offset) => selectionBounds.startIndex + offset,
							).map((columnIndex) => {
								const isStart = columnIndex === selectionBounds.startIndex;
								const isEnd = columnIndex === selectionBounds.endIndex;
								const rangeStart = isStart ? selectionRange.startMinutes : 0;
								const rangeEnd = isEnd ? selectionRange.endMinutes : 24 * 60;
								const heightMinutes = Math.max(0, rangeEnd - rangeStart);
								return (
									<div
										key={`selection-${columnIndex}`}
										className="absolute rounded-sm border"
										style={{
											top: `${(rangeStart / SLOT_MINUTES) * SLOT_HEIGHT}px`,
											height: `${(heightMinutes / SLOT_MINUTES) * SLOT_HEIGHT}px`,
											left: `calc(${selectionColumnWidth * columnIndex}% + 2px)`,
											width: `calc(${selectionColumnWidth}% - 4px)`,
											borderColor: `color-mix(in srgb, ${resizeColor} 38%, transparent)`,
											backgroundColor: `color-mix(in srgb, ${resizeColor} 10%, transparent)`,
										}}
									/>
								);
							})}
						</div>
					) : null}
					{showTimedDrag && timedDragRange && timedDragBounds ? (
						<div className="pointer-events-none absolute inset-0 z-10">
							{Array.from(
								{ length: timedDragBounds.endIndex - timedDragBounds.startIndex + 1 },
								(_, offset) => timedDragBounds.startIndex + offset,
							).map((columnIndex) => {
								const isStart = columnIndex === timedDragBounds.startIndex;
								const isEnd = columnIndex === timedDragBounds.endIndex;
								const rangeStart = isStart ? timedDragRange.startMinutes : 0;
								const rangeEnd = isEnd ? timedDragRange.endMinutes : 24 * 60;
								const heightMinutes = Math.max(0, rangeEnd - rangeStart);
								return (
									<div
										key={`drag-${columnIndex}`}
										className="absolute rounded-sm border"
										style={{
											top: `${(rangeStart / SLOT_MINUTES) * SLOT_HEIGHT}px`,
											height: `${(heightMinutes / SLOT_MINUTES) * SLOT_HEIGHT}px`,
											left: `calc(${selectionColumnWidth * columnIndex}% + 2px)`,
											width: `calc(${selectionColumnWidth}% - 4px)`,
											borderColor: `color-mix(in srgb, ${dragColor} 38%, transparent)`,
											backgroundColor: `color-mix(in srgb, ${dragColor} 10%, transparent)`,
										}}
									/>
								);
							})}
						</div>
					) : null}
					{showNowIndicator ? (
						<div className="pointer-events-none absolute inset-0 z-50">
							<div
								className="absolute h-[2px] bg-[var(--text-error)]"
								style={{
									top: `${nowTop}px`,
									left: `calc(${todayColumnWidth * todayIndex}% + 0px)`,
									width: `calc(${todayColumnWidth}% - 0px)`,
								}}
							/>
						</div>
					) : null}
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
						const duration = placement.endMinutes - placement.startMinutes;
						const columnWidth = 100 / 7;
						const width = columnWidth / placement.columnCount;
						const left = columnWidth * placement.dayOffset + width * placement.column;
						const eventColor =
							normalizeEventColor(placement.segment.event.color) ?? DEFAULT_EVENT_COLOR;
						const eventStartMinutes =
							toMinutes(placement.segment.event.startTime) ?? placement.startMinutes;
						const eventEndMinutes =
							toMinutes(placement.segment.event.endTime) ?? placement.endMinutes;
						const hasDragRange = isDraggingEvent && Boolean(timedDragRange && timedDragBounds);
						const dragRangeStartKey = timedDragRange
							? compareDateKey(timedDragRange.startDateKey, timedDragRange.endDateKey) <= 0
								? timedDragRange.startDateKey
								: timedDragRange.endDateKey
							: null;
						const dragRangeEndKey = timedDragRange
							? compareDateKey(timedDragRange.startDateKey, timedDragRange.endDateKey) <= 0
								? timedDragRange.endDateKey
								: timedDragRange.startDateKey
							: null;
						const isInDragRange =
							hasDragRange &&
							dragRangeStartKey !== null &&
							dragRangeEndKey !== null &&
							compareDateKey(placementDateKey, dragRangeStartKey) >= 0 &&
							compareDateKey(placementDateKey, dragRangeEndKey) <= 0;
						const dragStartMinutes =
							isInDragRange && timedDragRange
								? placementDateKey === dragRangeStartKey
									? timedDragRange.startMinutes
									: 0
								: null;
						const dragEndMinutes =
							isInDragRange && timedDragRange
								? placementDateKey === dragRangeEndKey
									? timedDragRange.endMinutes
									: MINUTES_IN_DAY
								: null;
						const baseLabelStartMinutes = eventStartMinutes;
						const baseLabelEndMinutes = eventEndMinutes;
						const labelStartMinutes = dragStartMinutes ?? baseLabelStartMinutes;
						const labelEndMinutes =
							dragEndMinutes ??
							(isResizingEvent && timedResizeRange && resizeRangeKeys?.endKey === placementDateKey
								? timedResizeRange.endMinutes
								: baseLabelEndMinutes);
						const startLabel = formatTime(labelStartMinutes);
						const endLabel = formatTime(labelEndMinutes);
						let visualStartMinutes: number | null = null;
						let visualEndMinutes: number | null = null;
						if (isResizingEvent && timedResizeRange && resizeRangeKeys) {
							const isSameDay = resizeRangeKeys.startKey === resizeRangeKeys.endKey;
							if (isSameDay) {
								visualStartMinutes = eventStartMinutes;
								visualEndMinutes = timedResizeRange.endMinutes;
							} else if (placementDateKey === resizeRangeKeys.startKey) {
								visualStartMinutes = eventStartMinutes;
								visualEndMinutes = MINUTES_IN_DAY;
							} else if (placementDateKey === resizeRangeKeys.endKey) {
								visualStartMinutes = 0;
								visualEndMinutes = timedResizeRange.endMinutes;
							} else {
								visualStartMinutes = 0;
								visualEndMinutes = MINUTES_IN_DAY;
							}
						} else if (dragStartMinutes !== null && dragEndMinutes !== null) {
							visualStartMinutes = dragStartMinutes;
							visualEndMinutes = dragEndMinutes;
						}
						if (visualStartMinutes !== null && visualEndMinutes !== null) {
							const clampedStart = Math.max(0, Math.min(MINUTES_IN_DAY, visualStartMinutes));
							const clampedEnd = Math.max(0, Math.min(MINUTES_IN_DAY, visualEndMinutes));
							visualStartMinutes = Math.min(clampedStart, clampedEnd);
							visualEndMinutes = Math.max(clampedStart, clampedEnd);
						}
						const visualTop =
							visualStartMinutes !== null && visualEndMinutes !== null
								? (visualStartMinutes / SLOT_MINUTES) * SLOT_HEIGHT
								: (placement.startMinutes / SLOT_MINUTES) * SLOT_HEIGHT;
						const baseHeight =
							visualEndMinutes !== null && visualStartMinutes !== null
								? Math.max(0, (visualEndMinutes - visualStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT
								: (duration / SLOT_MINUTES) * SLOT_HEIGHT;
						const visualHeight = isDraggingEvent ? 40 : baseHeight;
						return (
							<div
								key={`timed-${placement.segment.id}`}
								className={`group absolute z-20 cursor-pointer overflow-hidden rounded-md border text-[11px] font-semibold text-[color:var(--text-on-accent)] ${
									placement.segment.event.completed ? 'opacity-60' : ''
								}`}
								style={{
									top: `${visualTop}px`,
									left: `calc(${left}% + 2px)`,
									width: `calc(${width}% - 4px)`,
									height: `${visualHeight}px`,
									backgroundColor: eventColor,
									borderColor: eventColor,
									opacity: isDraggingEvent ? 0 : undefined,
									overflow: isDraggingEvent ? 'hidden' : undefined,
								}}
								draggable
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
									onEventClick(placement.segment);
								}}
							>
								<div className="flex items-center gap-1 px-2 py-1">
									{placement.segment.event.taskEvent ? (
										<input
											type="checkbox"
											checked={Boolean(placement.segment.event.completed)}
											className="m-0 h-[10px] w-[10px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]"
											onPointerDown={(event) => event.stopPropagation()}
											onClick={(event) => event.stopPropagation()}
											onChange={(event) => {
												event.stopPropagation();
												event.preventDefault();
												onToggleCompleted(placement.segment);
											}}
										/>
									) : null}
									<span className="truncate">{placement.segment.event.title}</span>
								</div>
								<div className="px-2 text-[10px] opacity-90">
									{startLabel} - {endLabel}
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
