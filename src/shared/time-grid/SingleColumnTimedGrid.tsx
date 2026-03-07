import {
	buildSingleColumnTimedDragAnchor,
	buildSingleColumnTimedEventRenderEntries,
	resolveSingleColumnOverlayState,
} from '../event/timed-visual-model';
import { SingleColumnDayCell } from './SingleColumnDayCell';
import { TimeGridOverlayLayers } from './TimeGridOverlayLayers';
import { renderTimedEventCardNode, type TimedEventCardVariant } from './TimedEventCard';
import { TimedGridFrame } from './TimedGridFrame';
import type {
	SingleColumnTimedGridModel,
	SingleColumnTimedGridState,
} from './single-column-view-types';
import type { ComponentChildren } from 'preact';

type SingleColumnTimedGridProps = {
	state: SingleColumnTimedGridState;
	variant?: TimedEventCardVariant;
	outerClassName: string;
	axisClassName: string;
	gridClassName: string;
	renderAxisLabels: (model: SingleColumnTimedGridModel) => ComponentChildren;
	renderBackground: (model: SingleColumnTimedGridModel) => ComponentChildren;
};

export const SingleColumnTimedGrid = ({
	state,
	variant,
	outerClassName,
	axisClassName,
	gridClassName,
	renderAxisLabels,
	renderBackground,
}: SingleColumnTimedGridProps) => {
	const {
		date,
		timedEvents,
		isToday,
		nowTop,
		showNowIndicator,
		formatDateKey,
		formatTime,
		timeGridHeight,
		slotHeight,
		slotMinutes,
	} = state.model;
	const {
		onEventClick,
		onToggleCompleted,
		onTimedResizeStart,
		onTimedEventDragStart,
		onTimedEventDragEnd,
	} = state.eventHandlers;
	const {
		onTimeGridPointerDown,
		onTimeGridPointerMove,
		onTimedEventDragOver,
		onTimedEventDrop,
		timeGridRef,
	} = state.interactionHandlers;
	const {
		selectionRange,
		timedResizeRange,
		timedResizeColor,
		timedDragRange,
		timedDragColor,
		timedResizingId,
		timedDraggingId,
	} = state.overlayState;
	const { defaultEventColor, normalizeEventColor } = state.appearance;
	const dateKey = formatDateKey(date);
	const today = isToday(date);
	const { selectionSegments, timedDragSegments, showTimedDrag } = resolveSingleColumnOverlayState({
		dateKey,
		selectionRange,
		timedResizeRange,
		timedDragRange,
	});
	const resizeColor = normalizeEventColor(timedResizeColor) ?? defaultEventColor;
	const dragColor = normalizeEventColor(timedDragColor) ?? defaultEventColor;
	const timedEventEntries = buildSingleColumnTimedEventRenderEntries({
		timedEvents,
		dateKey,
		slotMinutes,
		slotHeight,
		timedResizingId,
		timedDraggingId,
		timedResizeRange,
		timedDragRange,
		showTimedDrag,
		defaultEventColor,
		normalizeEventColor,
		formatTime,
	});
	const timedEventNodes = timedEventEntries.map((entry) =>
		renderTimedEventCardNode({
			entry,
			onEventClick,
			onToggleCompleted,
			onTimedResizeStart,
			onTimedEventDragStart,
			onTimedEventDragEnd,
			dragAnchor: buildSingleColumnTimedDragAnchor(dateKey, entry.placement),
			variant,
		}),
	);

	return (
		<TimedGridFrame
			outerClassName={outerClassName}
			axisClassName={axisClassName}
			gridClassName={gridClassName}
			timeGridHeight={timeGridHeight}
			showNowIndicator={showNowIndicator}
			nowTop={nowTop}
			timeGridRef={timeGridRef}
			onTimeGridPointerDown={onTimeGridPointerDown}
			onTimeGridPointerMove={onTimeGridPointerMove}
			onTimedEventDragOver={onTimedEventDragOver}
			onTimedEventDrop={onTimedEventDrop}
			renderAxisLabels={() => renderAxisLabels(state.model)}
		>
			{renderBackground(state.model)}
			<TimeGridOverlayLayers
				selectionSegments={selectionSegments}
				timedDragSegments={timedDragSegments}
				columnCount={1}
				slotMinutes={slotMinutes}
				slotHeight={slotHeight}
				resizeColor={resizeColor}
				dragColor={dragColor}
				showNowIndicator={showNowIndicator}
				nowTop={nowTop}
				nowIndicatorLeft="calc(0% + 0px)"
				nowIndicatorWidth="calc(100% - 0px)"
			/>
			<SingleColumnDayCell
				dateKey={dateKey}
				isToday={today}
				className="relative flex-1"
				style={{ height: timeGridHeight }}
			/>
			{timedEventNodes}
		</TimedGridFrame>
	);
};
