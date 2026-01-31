import { canMoveEvent } from '../event-sync';
import type { EventSegment, WeekMultiDayPlacement, WeekSingleDayPlacement } from '../types';
import type { DayCellData } from '../utils/date-grid';
import { isToday } from '../utils/date-grid';
import { getWeekEventLayout } from '../utils/event-layout';
import {
	DEFAULT_EVENT_COLOR,
	EVENT_ROW_GAP,
	EVENT_ROW_HEIGHT,
	formatDateKey,
	normalizeEventColor,
} from '../utils/month-calendar-utils';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

type WeekCellData = DayCellData & { key: string };

type WeekCellProps = {
	weekStartIndex: number;
	weekEndIndex: number;
	weekCells: WeekCellData[];
	eventRows: EventSegment[][];
	rowCapacity: number;
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
	onMoreClick: (dateKey: string) => void;
};

const DAY_EVENT_TOP_PADDING = 4;
const MORE_ROW_HEIGHT = EVENT_ROW_HEIGHT;
const MORE_ROW_GAP = EVENT_ROW_GAP;
const WEEK_DAY_KEYS = [0, 1, 2, 3, 4, 5, 6] as const;

type WeekCapacityResult = {
	containerRef: (el: HTMLDivElement | null) => void;
	eventsRef: (el: HTMLDivElement | null) => void;
	containerElRef: { current: HTMLDivElement | null };
	capacity: number;
};

const useWeekCapacity = (requestedCapacity: number): WeekCapacityResult => {
	const containerElRef = useRef<HTMLDivElement | null>(null);
	const eventsElRef = useRef<HTMLDivElement | null>(null);
	const [capacity, setCapacity] = useState(0);

	useEffect(() => {
		const containerEl = containerElRef.current;
		const eventsEl = eventsElRef.current;
		if (!containerEl || !eventsEl) return;

		const updateCapacity = () => {
			const containerRect = containerEl.getBoundingClientRect();
			const eventsRect = eventsEl.getBoundingClientRect();
			const availableHeight = Math.max(
				0,
				containerRect.bottom - eventsRect.top - DAY_EVENT_TOP_PADDING,
			);
			if (requestedCapacity <= 0) {
				setCapacity(0);
				return;
			}
			const baseCapacity = Math.max(
				0,
				Math.floor((availableHeight + EVENT_ROW_GAP) / (EVENT_ROW_HEIGHT + EVENT_ROW_GAP)),
			);
			const next = Math.min(requestedCapacity, baseCapacity);
			setCapacity((prev) => (prev === next ? prev : next));
		};

		updateCapacity();
		const observer = new ResizeObserver(updateCapacity);
		observer.observe(containerEl);
		observer.observe(eventsEl);
		return () => observer.disconnect();
	}, [requestedCapacity]);

	return {
		containerRef: (el) => {
			containerElRef.current = el;
		},
		eventsRef: (el) => {
			eventsElRef.current = el;
		},
		containerElRef,
		capacity,
	};
};

const shouldRenderContent = (placement: WeekMultiDayPlacement | WeekSingleDayPlacement) => {
	if (placement.spanInWeek <= 1) return true;
	// Render content on the actual start or the first visible day in a week.
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

const getMarginClass = (placement: WeekMultiDayPlacement | WeekSingleDayPlacement) => {
	if (placement.spanInWeek <= 1) return 'mx-1';
	const hasLeftEdge = placement.isSpanStart;
	const hasRightEdge = placement.isSpanEnd;
	if (hasLeftEdge && hasRightEdge) return 'mx-1';
	if (hasLeftEdge) return 'ml-1';
	if (hasRightEdge) return 'mr-1';
	return '';
};

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
	const capRadiusClass = '';
	const capMarginClass = '';
	const renderContent = shouldRenderContent(placement);

	return (
		<div
			key={`${placement.segment.id}-${placement.weekRow}-${placement.columnStart}`}
			className={`group pointer-events-auto relative cursor-pointer truncate border border-[var(--interactive-accent)] bg-[var(--interactive-accent)] py-0.5 text-[11px] leading-tight font-semibold text-[color:var(--text-on-accent)] ${edgeRadiusClass} ${marginClass} ${capRadiusClass} ${capMarginClass} ${
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
							className="m-0 h-[10px] w-[10px] -translate-y-[1px] cursor-pointer border-2 p-0"
							style={{
								borderColor: '#ffffff',
								backgroundColor: placement.segment.event.completed ? '#22c55e' : 'transparent',
							}}
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

export const WeekCell = ({
	weekStartIndex,
	weekEndIndex,
	weekCells,
	eventRows,
	rowCapacity,
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
	onMoreClick,
}: WeekCellProps) => {
	const { containerRef, eventsRef, capacity } = useWeekCapacity(rowCapacity);
	const measuredCapacity = rowCapacity <= 0 ? 0 : Math.max(1, Math.min(rowCapacity, capacity));
	const hasRowCapacity = measuredCapacity > 0;
	const layoutCapacity = hasRowCapacity ? measuredCapacity + 1 : 1;
	const layout = useMemo(
		() => getWeekEventLayout(eventRows, weekStartIndex, weekEndIndex, layoutCapacity),
		[eventRows, layoutCapacity, weekEndIndex, weekStartIndex],
	);
	const gridTemplateRows = `repeat(${Math.max(layoutCapacity, 1)}, ${EVENT_ROW_HEIGHT}px)`;
	const moreRowIndex = hasRowCapacity ? measuredCapacity : 0;
	const moreRowGridRow = moreRowIndex + 1;
	const baseHiddenCountsByDay = layout.hiddenCountsByDay;
	const correctedHiddenCountsByDay = useMemo(() => {
		const counts: Record<(typeof WEEK_DAY_KEYS)[number], number> = {
			0: baseHiddenCountsByDay[0] ?? 0,
			1: baseHiddenCountsByDay[1] ?? 0,
			2: baseHiddenCountsByDay[2] ?? 0,
			3: baseHiddenCountsByDay[3] ?? 0,
			4: baseHiddenCountsByDay[4] ?? 0,
			5: baseHiddenCountsByDay[5] ?? 0,
			6: baseHiddenCountsByDay[6] ?? 0,
		};
		if (measuredCapacity <= 0) {
			return counts;
		}
		const visiblePlacementCountByDay: Record<(typeof WEEK_DAY_KEYS)[number], number> = {
			0: 0,
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 0,
			6: 0,
		};
		const allPlacements = [...layout.multiDayPlacements, ...layout.singleDayPlacements];
		for (const placement of allPlacements) {
			if (placement.weekRow !== measuredCapacity) continue;
			const startOffset = Math.max(0, placement.columnStart - 1);
			const endOffset = Math.min(6, startOffset + placement.spanInWeek - 1);
			for (let offset = startOffset; offset <= endOffset; offset += 1) {
				const dayKey = offset as (typeof WEEK_DAY_KEYS)[number];
				visiblePlacementCountByDay[dayKey] += 1;
			}
		}
		for (const dayKey of WEEK_DAY_KEYS) {
			if (visiblePlacementCountByDay[dayKey] === 0) continue;
			counts[dayKey] += 1;
		}
		return counts;
	}, [
		baseHiddenCountsByDay,
		layout.multiDayPlacements,
		layout.singleDayPlacements,
		measuredCapacity,
	]);
	const hasAnyMore = WEEK_DAY_KEYS.some((dayKey) => (correctedHiddenCountsByDay[dayKey] ?? 0) > 0);
	const visibleMultiDayPlacements = layout.multiDayPlacements.filter(
		(placement) => placement.weekRow < moreRowIndex,
	);
	const visibleSingleDayPlacements = layout.singleDayPlacements.filter(
		(placement) => placement.weekRow < moreRowIndex,
	);
	return (
		<div className="relative grid h-full min-h-0 grid-cols-7 gap-px" ref={containerRef}>
			{weekCells.map((cell) => {
				const pressed = isSelecting && anchorDateKey === cell.key;
				const today = isToday(cell.date);
				return (
					<div
						key={cell.key}
						data-date-key={cell.key}
						className={`relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent py-2 ${
							today ? 'bg-[color-mix(in srgb, var(--interactive-accent) 4%, transparent)]' : ''
						} ${
							pressed ? 'bg-[color-mix(in srgb, var(--interactive-accent) 16%, transparent)]' : ''
						}`}
						style={{
							border: '0.5px solid',
							borderColor: 'color-mix(in srgb, var(--background-modifier-border) 38%, transparent)',
						}}
						onClick={() => onDateClick(cell.key)}
						onPointerDown={() => onSelectionStart(cell.key)}
						onPointerEnter={() => onSelectionHover(cell.key)}
					>
						<div className="mx-1 flex items-center justify-start pb-1 pl-2">
							<div
								className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--background-modifier-hover)] text-[11px] font-semibold text-[color:var(--text-normal)] ${
									cell.inMonth ? '' : 'bg-transparent text-[color:var(--text-faint)] opacity-[0.35]'
								} ${today ? 'bg-[var(--interactive-accent)] text-[color:var(--text-on-accent)]' : ''}`}
							>
								{cell.date.getDate()}
							</div>
						</div>
					</div>
				);
			})}

			<div className="pointer-events-none absolute inset-x-0 top-10 bottom-0 z-20" ref={eventsRef}>
				<div
					className="relative h-full w-full"
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
						gridTemplateRows,
						rowGap: EVENT_ROW_GAP,
						paddingTop: `${DAY_EVENT_TOP_PADDING}px`,
					}}
				>
					{visibleMultiDayPlacements.map((placement) => (
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
					{visibleSingleDayPlacements.map((placement) => (
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
					{hasAnyMore &&
						weekCells.map((cell, columnIndex) => {
							const dayKey = columnIndex as (typeof WEEK_DAY_KEYS)[number];
							const hiddenCount = correctedHiddenCountsByDay[dayKey] ?? 0;
							const displayCount = hiddenCount;
							if (displayCount <= 0) return null;
							const dateKey = formatDateKey(cell.date);
							return (
								<div
									key={`more-${cell.key}`}
									className="pointer-events-auto z-40 mx-1 flex items-center text-left text-[11px] font-semibold"
									style={{
										gridRow: moreRowGridRow,
										gridColumn: `${columnIndex + 1} / span 1`,
										height: `${MORE_ROW_HEIGHT}px`,
										marginTop: `${MORE_ROW_GAP / 2}px`,
										marginBottom: `${MORE_ROW_GAP / 2}px`,
									}}
									onPointerDown={(event) => {
										event.stopPropagation();
									}}
								>
									<span
										className="cursor-pointer truncate text-[color:var(--text-muted)] hover:text-[color:var(--text-normal)]"
										onClick={(event) => {
											event.stopPropagation();
											onMoreClick(dateKey);
										}}
									>
										+{displayCount} more
									</span>
								</div>
							);
						})}
				</div>
			</div>
		</div>
	);
};
