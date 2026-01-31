import type { SelectionSpan } from '../utils/event-layout';

type DragOverlayProps = {
	weekIndex: number;
	dragRange: { start: string; end: string } | null;
	resizeRange: { start: string; end: string } | null;
	dragHoverIndex: number | null;
	indexByDateKey: Map<string, number>;
	gridByIndex: Array<{ key: string }>;
	draggingColor?: string;
	resizingColor?: string;
	selectionSpan?: SelectionSpan | null;
	DEFAULT_EVENT_COLOR: string;
	normalizeEventColor: (color?: string | null) => string | null;
};

export const DragOverlay = ({
	weekIndex,
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
}: DragOverlayProps) => {
	const renderRangeOverlay = () => {
		if (!dragRange && !resizeRange) return null;
		const weekStartIndex = weekIndex * 7;
		const weekEndIndex = weekStartIndex + 6;
		const range = resizeRange ?? dragRange;
		if (!range) return null;
		let startIndex = indexByDateKey.get(range.start);
		let endIndex = indexByDateKey.get(range.end);
		const gridStartKey = gridByIndex[0]?.key;
		const gridEndKey = gridByIndex[gridByIndex.length - 1]?.key;
		if (startIndex === undefined) {
			if (gridStartKey && range.start < gridStartKey) {
				startIndex = 0;
			} else {
				return null;
			}
		}
		if (endIndex === undefined) {
			if (gridEndKey && range.end > gridEndKey) {
				endIndex = gridByIndex.length - 1;
			} else {
				return null;
			}
		}
		// No intersection with this week, so skip rendering entirely.
		if (endIndex < weekStartIndex || startIndex > weekEndIndex) return null;
		const clampedStart = Math.max(startIndex, weekStartIndex);
		const clampedEnd = Math.min(endIndex, weekEndIndex);
		const columnStart = clampedStart - weekStartIndex + 1;
		const span = clampedEnd - clampedStart + 1;
		const overlayColor =
			normalizeEventColor(resizeRange ? resizingColor : draggingColor) ?? DEFAULT_EVENT_COLOR;
		return (
			<div className="pointer-events-none absolute inset-0 z-5 grid grid-cols-7">
				<div
					className="h-full w-full"
					style={{
						gridColumn: `${columnStart} / span ${span}`,
						backgroundColor: `color-mix(in srgb, ${overlayColor} 24%, transparent)`,
					}}
				/>
			</div>
		);
	};

	const renderHoverOverlay = () => {
		if (dragHoverIndex === null) return null;
		const weekStartIndex = weekIndex * 7;
		const weekEndIndex = weekStartIndex + 6;
		if (dragHoverIndex < weekStartIndex || dragHoverIndex > weekEndIndex) return null;
		const columnStart = dragHoverIndex - weekStartIndex + 1;
		const overlayColor = normalizeEventColor(draggingColor) ?? DEFAULT_EVENT_COLOR;
		return (
			<div className="pointer-events-none absolute inset-0 z-5 grid grid-cols-7">
				<div
					className="h-full w-full"
					style={{
						gridColumn: `${columnStart} / span 1`,
						backgroundColor: `color-mix(in srgb, ${overlayColor} 24%, transparent)`,
					}}
				/>
			</div>
		);
	};

	return (
		<>
			{renderRangeOverlay()}
			{renderHoverOverlay()}
			{selectionSpan ? (
				<div className="pointer-events-none absolute inset-0 z-0 grid grid-cols-7">
					<div
						className="h-full w-full border"
						style={{
							gridColumn: `${selectionSpan.columnStart} / span ${selectionSpan.span}`,
							borderColor: `color-mix(in srgb, ${DEFAULT_EVENT_COLOR} 38%, transparent)`,
							backgroundColor: `color-mix(in srgb, ${DEFAULT_EVENT_COLOR} 10%, transparent)`,
						}}
					/>
				</div>
			) : null}
		</>
	);
};
