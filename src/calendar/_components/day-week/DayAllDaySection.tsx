import type { AllDayEventInteractionHandlers } from '../../all-day-interaction-types';
import type { EventSegment } from '../../types';
import { AllDayEventGrid } from './AllDayEventGrid';
import { AllDaySectionFrame } from './AllDaySectionFrame';

type DayAllDaySectionProps = AllDayEventInteractionHandlers & {
	dayCell: { key: string; date: Date; inMonth: boolean };
	eventRows: EventSegment[][];
	anchorDateKey: string | null;
	isSelecting: boolean;
	draggingId: string | null;
	dragRange: { start: string; end: string } | null;
	resizeRange: { start: string; end: string } | null;
	dragHoverIndex: number | null;
	draggingColor?: string;
	resizingColor?: string;
	selectionSpan: { columnStart: number; span: number } | null;
	DEFAULT_EVENT_COLOR: string;
	normalizeEventColor: (color?: string | null) => string | null;
	onDragOverCapture: (event: DragEvent) => void;
	onDragEnterCapture: (event: DragEvent) => void;
	onDropCapture: (event: DragEvent) => void;
	gridRef: { current: HTMLDivElement | null };
};

export const DayAllDaySection = ({
	dayCell,
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
	draggingColor,
	resizingColor,
	selectionSpan,
	DEFAULT_EVENT_COLOR,
	normalizeEventColor,
	onDragOverCapture,
	onDragEnterCapture,
	onDropCapture,
	gridRef,
}: DayAllDaySectionProps) => {
	const pressed = isSelecting && anchorDateKey === dayCell.key;
	return (
		<AllDaySectionFrame
			gridRef={gridRef}
			onDragOverCapture={onDragOverCapture}
			onDragEnterCapture={onDragEnterCapture}
			onDropCapture={onDropCapture}
			overlay={
				<>
					{dragRange || resizeRange ? (
						<div
							className="pointer-events-none absolute inset-0 z-5"
							style={{
								backgroundColor: `color-mix(in srgb, ${
									normalizeEventColor(resizeRange ? resizingColor : draggingColor) ??
									DEFAULT_EVENT_COLOR
								} 24%, transparent)`,
							}}
						/>
					) : null}
					{dragHoverIndex !== null ? (
						<div
							className="pointer-events-none absolute inset-0 z-5"
							style={{
								backgroundColor: `color-mix(in srgb, ${
									normalizeEventColor(draggingColor) ?? DEFAULT_EVENT_COLOR
								} 24%, transparent)`,
							}}
						/>
					) : null}
					{selectionSpan ? (
						<div className="pointer-events-none absolute inset-0 z-0">
							<div
								className="h-full w-full border"
								style={{
									borderColor: `color-mix(in srgb, ${DEFAULT_EVENT_COLOR} 38%, transparent)`,
									backgroundColor: `color-mix(in srgb, ${DEFAULT_EVENT_COLOR} 10%, transparent)`,
								}}
							/>
						</div>
					) : null}
					{pressed ? (
						<div className="bg-[color-mix(in srgb, var(--interactive-accent) 16%, transparent)] pointer-events-none absolute inset-0 z-0" />
					) : null}
				</>
			}
		>
			<AllDayEventGrid
				cells={[dayCell]}
				columnCount={1}
				weekStartIndex={0}
				weekEndIndex={0}
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
		</AllDaySectionFrame>
	);
};
