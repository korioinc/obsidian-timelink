import { isToday } from '../../../shared/event/model-utils';
import type { AllDayEventInteractionHandlers } from '../../all-day-interaction-types';
import type { EventSegment } from '../../types';
import { deriveAllDayLayoutMetrics } from '../../utils/all-day-layout';
import { EVENT_ROW_GAP } from '../../utils/month-calendar-utils';
import { AllDayEventBar } from './AllDayEventBar';
import { DayColumnCell } from './DayColumnCell';
import { useMemo } from 'preact/hooks';

type AllDayCellData = {
	key: string;
	date: Date;
	inMonth: boolean;
};

export type AllDayEventGridProps = AllDayEventInteractionHandlers & {
	cells: AllDayCellData[];
	columnCount: number;
	weekStartIndex: number;
	weekEndIndex: number;
	eventRows: EventSegment[][];
	anchorDateKey: string | null;
	isSelecting: boolean;
	draggingId: string | null;
	showTodayBorder?: boolean;
};

export const createAllDayGridColumnsStyle = (columnCount: number) => ({
	gridTemplateColumns: `repeat(${Math.max(1, columnCount)}, minmax(0, 1fr))`,
});

export const createAllDayCellLayerStyle = (columnCount: number) => ({
	...createAllDayGridColumnsStyle(columnCount),
	gridColumn: '1 / -1',
});

export const AllDayEventGrid = ({
	cells,
	columnCount,
	weekStartIndex,
	weekEndIndex,
	eventRows,
	anchorDateKey,
	isSelecting,
	draggingId,
	showTodayBorder = false,
	onDateClick,
	onSelectionStart,
	onSelectionHover,
	onDragStart,
	onDragEnd,
	onEventClick,
	onResizeStart,
	onToggleCompleted,
}: AllDayEventGridProps) => {
	const { layout, gridTemplateRows, totalHeight } = useMemo(
		() =>
			deriveAllDayLayoutMetrics({
				eventRows,
				weekStartIndex,
				weekEndIndex,
				requestedCapacity: Math.max(1, eventRows.length),
			}),
		[eventRows, weekEndIndex, weekStartIndex],
	);
	const gridColumnsStyle = createAllDayGridColumnsStyle(columnCount);
	const cellLayerStyle = createAllDayCellLayerStyle(columnCount);

	return (
		<div
			className="relative grid h-full"
			style={{
				minHeight: `${totalHeight}px`,
				...gridColumnsStyle,
			}}
		>
			<div
				className="grid h-full min-h-0 divide-x divide-[var(--background-modifier-border)]"
				style={cellLayerStyle}
			>
				{cells.map((cell) => {
					const pressed = isSelecting && anchorDateKey === cell.key;
					const today = isToday(cell.date);
					return (
						<DayColumnCell
							key={cell.key}
							dateKey={cell.key}
							isToday={today}
							isPressed={pressed}
							showTodayBorder={showTodayBorder}
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
					className="relative grid h-full w-full pt-[4px] pb-[4px]"
					style={{
						...gridColumnsStyle,
						gridTemplateRows,
						rowGap: EVENT_ROW_GAP,
					}}
				>
					{layout.multiDayPlacements.map((placement) => (
						<AllDayEventBar
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
						<AllDayEventBar
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
