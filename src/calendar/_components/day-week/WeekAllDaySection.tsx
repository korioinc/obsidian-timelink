import type { WeekAllDaySectionProps } from '../../types';
import { DragOverlay } from '../month/DragOverlay';
import { AllDayEventGrid } from './AllDayEventGrid';
import { AllDaySectionFrame } from './AllDaySectionFrame';

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
}: WeekAllDaySectionProps) => (
	<AllDaySectionFrame
		gridRef={gridRef}
		onDragOverCapture={onDragOverCapture}
		onDragEnterCapture={onDragEnterCapture}
		onDropCapture={onDropCapture}
		overlay={
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
		}
	>
		<AllDayEventGrid
			cells={weekCells}
			columnCount={7}
			weekStartIndex={0}
			weekEndIndex={6}
			eventRows={eventRows}
			anchorDateKey={anchorDateKey}
			isSelecting={isSelecting}
			draggingId={draggingId}
			showTodayBorder={true}
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
