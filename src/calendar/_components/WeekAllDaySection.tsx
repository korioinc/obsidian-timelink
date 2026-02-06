import { canMoveEvent } from '../event-sync';
import type {
	EventSegment,
	WeekAllDaySectionProps,
	WeekMultiDayPlacement,
	WeekSingleDayPlacement,
} from '../types';
import { isToday } from '../utils/date-grid';
import { getWeekEventLayout } from '../utils/event-layout';
import {
	DEFAULT_EVENT_COLOR,
	EVENT_ROW_GAP,
	EVENT_ROW_HEIGHT,
	normalizeEventColor,
} from '../utils/month-calendar-utils';
import { DayColumnCell } from './DayColumnCell';
import { DragOverlay } from './DragOverlay';
import { useMemo } from 'preact/hooks';

type WeekCellData = {
	key: string;
	date: Date;
	inMonth: boolean;
};

type WeekAllDayGridProps = {
	weekCells: WeekCellData[];
	eventRows: EventSegment[][];
	anchorDateKey: string | null;
	isSelecting: boolean;
	draggingId: string | null;
	onDateClick: (dateKey: string) => void;
	onSelectionStart: (dateKey: string) => void;
	onSelectionHover: (dateKey: string) => void;
	onDragStart: (event: DragEvent, segment: EventSegment) => void;
	onDragEnd: () => void;
	onEventClick: (segment: EventSegment) => void;
	onResizeStart: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
};

const DAY_EVENT_TOP_PADDING = 4;

const shouldRenderContent = (placement: WeekMultiDayPlacement | WeekSingleDayPlacement) => {
	if (placement.spanInWeek <= 1) return true;
	return placement.isSpanStart || placement.columnStart === 1;
};

const getEdgeRadiusClass = (placement: WeekMultiDayPlacement | WeekSingleDayPlacement) => {
	if (placement.spanInWeek <= 1) return 'rounded-md';
	const hasLeftEdge = placement.isSpanStart;
	const hasRightEdge = placement.isSpanEnd;
	if (hasLeftEdge && hasRightEdge) return 'rounded-md';
	if (hasLeftEdge) return 'rounded-l-md';
	if (hasRightEdge) return 'rounded-r-md';
	return '';
};

const getMarginClass = (_placement: WeekMultiDayPlacement | WeekSingleDayPlacement) => '';

const EventBar = ({
	placement,
	draggingId,
	onDragStart,
	onDragEnd,
	onEventClick,
	onResizeStart,
	onToggleCompleted,
}: {
	placement: WeekMultiDayPlacement | WeekSingleDayPlacement;
	draggingId: string | null;
	onDragStart: (event: DragEvent, segment: EventSegment) => void;
	onDragEnd: () => void;
	onEventClick: (segment: EventSegment) => void;
	onResizeStart: (segment: EventSegment) => void;
	onToggleCompleted: (segment: EventSegment) => void;
}) => {
	const startTime = placement.segment.event.startTime?.trim() ?? '';
	const hasStartTime = startTime.length > 0;
	const eventColor = normalizeEventColor(placement.segment.event.color) ?? DEFAULT_EVENT_COLOR;
	const isTaskEvent = Boolean(placement.segment.event.taskEvent);
	const isSingleDay = placement.segment.span <= 1;
	const showResizeHandle = isSingleDay || placement.isActualEnd;
	const edgeRadiusClass = getEdgeRadiusClass(placement);
	const marginClass = getMarginClass(placement);
	const renderContent = shouldRenderContent(placement);

	return (
		<div
			key={`${placement.segment.id}-${placement.weekRow}-${placement.columnStart}`}
			className={`group pointer-events-auto relative cursor-pointer truncate border border-[var(--interactive-accent)] bg-[var(--interactive-accent)] py-0.5 text-[11px] leading-tight font-semibold text-[color:var(--text-on-accent)] ${edgeRadiusClass} ${marginClass} ${
				draggingId === placement.segment.id ? 'opacity-0' : ''
			} ${placement.segment.event.completed ? 'opacity-60' : ''}`}
			draggable={canMoveEvent(placement.segment.event)}
			onPointerDown={(event) => {
				event.stopPropagation();
			}}
			onDragStart={(event) => onDragStart(event, placement.segment)}
			onDragEnd={onDragEnd}
			onClick={(event) => {
				event.stopPropagation();
				onEventClick(placement.segment);
			}}
			style={{
				gridRow: placement.weekRow + 1,
				gridColumn: `${placement.columnStart} / span ${placement.spanInWeek}`,
				borderColor: eventColor,
				backgroundColor: eventColor,
			}}
		>
			{renderContent ? (
				<span className="ml-1 inline-flex items-center gap-[1px]">
					{isTaskEvent ? (
						<input
							type="checkbox"
							checked={Boolean(placement.segment.event.completed)}
							title={placement.segment.event.completed ? 'Mark incomplete' : 'Mark complete'}
							className="m-0 h-[10px] w-[10px] -translate-y-[1px] cursor-pointer border-2 border-white bg-transparent p-0 accent-[var(--text-success)]"
							onPointerDown={(event) => {
								event.stopPropagation();
							}}
							onClick={(event) => {
								event.stopPropagation();
							}}
							onChange={(event) => {
								event.stopPropagation();
								event.preventDefault();
								event.currentTarget.checked = !placement.segment.event.completed;
								onToggleCompleted(placement.segment);
							}}
						/>
					) : null}
					{hasStartTime ? <span className="mr-1">{startTime}</span> : null}
					<span
						style={
							placement.segment.event.completed
								? {
										textDecorationLine: 'line-through',
									}
								: undefined
						}
					>
						{placement.segment.event.title}
					</span>
				</span>
			) : null}
			{showResizeHandle ? (
				<span
					className={`pointer-events-auto absolute top-0 right-0 h-full cursor-col-resize opacity-0 ${
						isSingleDay ? 'w-3' : 'w-2'
					}`}
					title="Resize"
					onPointerDown={(event) => {
						event.stopPropagation();
						event.preventDefault();
						onResizeStart(placement.segment);
					}}
				/>
			) : null}
		</div>
	);
};

const WeekAllDayCell = ({
	weekCells,
	eventRows,
	anchorDateKey,
	isSelecting,
	draggingId,
	onDateClick,
	onSelectionStart,
	onSelectionHover,
	onDragStart,
	onDragEnd,
	onEventClick,
	onResizeStart,
	onToggleCompleted,
}: WeekAllDayGridProps) => {
	const rowCapacity = Math.max(1, eventRows.length);
	const layout = useMemo(
		() => getWeekEventLayout(eventRows, 0, 6, rowCapacity),
		[eventRows, rowCapacity],
	);
	const rowCount = Math.max(layout.weekRowCount, 1);
	const gridTemplateRows = `repeat(${rowCount}, ${EVENT_ROW_HEIGHT}px)`;
	const totalHeight =
		rowCount * EVENT_ROW_HEIGHT +
		Math.max(0, rowCount - 1) * EVENT_ROW_GAP +
		DAY_EVENT_TOP_PADDING * 2;

	return (
		<div
			className="relative grid h-full grid-cols-7"
			style={{
				minHeight: `${totalHeight}px`,
			}}
		>
			<div className="col-span-7 grid h-full min-h-0 grid-cols-7 divide-x divide-[var(--background-modifier-border)]">
				{weekCells.map((cell) => {
					const pressed = isSelecting && anchorDateKey === cell.key;
					const today = isToday(cell.date);
					return (
						<DayColumnCell
							key={cell.key}
							dateKey={cell.key}
							isToday={today}
							isPressed={pressed}
							showTodayBorder={true}
							className="relative flex h-full min-h-0 flex-col overflow-hidden"
							onClick={() => onDateClick(cell.key)}
							onPointerDown={() => onSelectionStart(cell.key)}
							onPointerEnter={() => onSelectionHover(cell.key)}
						/>
					);
				})}
			</div>
			<div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-20">
				<div
					className="relative grid h-full w-full grid-cols-7 pt-[4px] pb-[4px]"
					style={{
						gridTemplateRows,
						rowGap: EVENT_ROW_GAP,
					}}
				>
					{layout.multiDayPlacements.map((placement) => (
						<EventBar
							key={`multi-${placement.segment.id}-${placement.weekRow}-${placement.columnStart}`}
							placement={placement}
							draggingId={draggingId}
							onDragStart={onDragStart}
							onDragEnd={onDragEnd}
							onEventClick={onEventClick}
							onResizeStart={onResizeStart}
							onToggleCompleted={onToggleCompleted}
						/>
					))}
					{layout.singleDayPlacements.map((placement) => (
						<EventBar
							key={`single-${placement.segment.id}-${placement.weekRow}-${placement.columnStart}`}
							placement={placement}
							draggingId={draggingId}
							onDragStart={onDragStart}
							onDragEnd={onDragEnd}
							onEventClick={onEventClick}
							onResizeStart={onResizeStart}
							onToggleCompleted={onToggleCompleted}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export const WeekAllDaySection = ({
	weekCells,
	eventRows,
	anchorDateKey,
	isSelecting,
	draggingId,
	onDateClick,
	onSelectionStart,
	onSelectionHover,
	onDragStart,
	onDragEnd,
	onEventClick,
	onResizeStart,
	onToggleCompleted,
	dragRange,
	resizeRange,
	dragHoverIndex,
	indexByDateKey,
	gridByIndex,
	draggingColor,
	resizingColor,
	selectionSpan,
	DEFAULT_EVENT_COLOR,
	normalizeEventColor,
	onDragOverCapture,
	onDragEnterCapture,
	onDropCapture,
	gridRef,
}: WeekAllDaySectionProps) => {
	return (
		<div className="flex border-x border-[var(--background-modifier-border)]">
			<div className="flex w-[56px] shrink-0 items-center justify-center border-r border-[var(--background-modifier-border)] text-[10px] font-semibold tracking-[0.2em] text-[color:var(--text-muted)] uppercase">
				<span className="text-center whitespace-pre-line">ALL{'\n'}DAY</span>
			</div>
			<div
				ref={gridRef}
				className="relative z-60 min-h-[120px] flex-1 border-t border-[var(--background-modifier-border)] bg-[var(--background-primary)]"
				onDragOverCapture={onDragOverCapture}
				onDragEnterCapture={onDragEnterCapture}
				onDropCapture={onDropCapture}
			>
				<DragOverlay
					weekIndex={0}
					dragRange={dragRange}
					resizeRange={resizeRange}
					dragHoverIndex={dragHoverIndex}
					indexByDateKey={indexByDateKey}
					gridByIndex={gridByIndex}
					draggingColor={draggingColor}
					resizingColor={resizingColor}
					selectionSpan={selectionSpan}
					DEFAULT_EVENT_COLOR={DEFAULT_EVENT_COLOR}
					normalizeEventColor={normalizeEventColor}
				/>
				<div className="relative z-10 h-full min-h-0">
					<WeekAllDayCell
						weekCells={weekCells}
						eventRows={eventRows}
						anchorDateKey={anchorDateKey}
						isSelecting={isSelecting}
						draggingId={draggingId}
						onDateClick={onDateClick}
						onSelectionStart={onSelectionStart}
						onSelectionHover={onSelectionHover}
						onDragStart={onDragStart}
						onDragEnd={onDragEnd}
						onEventClick={onEventClick}
						onResizeStart={onResizeStart}
						onToggleCompleted={onToggleCompleted}
					/>
				</div>
			</div>
		</div>
	);
};
