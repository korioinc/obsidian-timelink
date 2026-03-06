import { TimeGridRangeOverlay } from './TimeGridRangeOverlay';
import type { TimeGridOverlaySegment } from './types';

type TimeGridOverlayLayersProps = {
	selectionSegments: TimeGridOverlaySegment[];
	timedDragSegments: TimeGridOverlaySegment[];
	columnCount: number;
	slotMinutes: number;
	slotHeight: number;
	resizeColor: string;
	dragColor: string;
	showNowIndicator: boolean;
	nowTop: number;
	nowIndicatorLeft: string;
	nowIndicatorWidth: string;
};

export const TimeGridOverlayLayers = ({
	selectionSegments,
	timedDragSegments,
	columnCount,
	slotMinutes,
	slotHeight,
	resizeColor,
	dragColor,
	showNowIndicator,
	nowTop,
	nowIndicatorLeft,
	nowIndicatorWidth,
}: TimeGridOverlayLayersProps) => (
	<>
		<TimeGridRangeOverlay
			segments={selectionSegments}
			columnCount={columnCount}
			slotMinutes={slotMinutes}
			slotHeight={slotHeight}
			borderColor={`color-mix(in srgb, ${resizeColor} 38%, transparent)`}
			backgroundColor={`color-mix(in srgb, ${resizeColor} 10%, transparent)`}
			keyPrefix="selection"
		/>
		<TimeGridRangeOverlay
			segments={timedDragSegments}
			columnCount={columnCount}
			slotMinutes={slotMinutes}
			slotHeight={slotHeight}
			borderColor={`color-mix(in srgb, ${dragColor} 38%, transparent)`}
			backgroundColor={`color-mix(in srgb, ${dragColor} 10%, transparent)`}
			keyPrefix="drag"
		/>
		{showNowIndicator ? (
			<div className="pointer-events-none absolute inset-0 z-50">
				<div
					className="absolute h-[2px] bg-[var(--text-error)]"
					style={{
						top: `${nowTop}px`,
						left: nowIndicatorLeft,
						width: nowIndicatorWidth,
					}}
				/>
			</div>
		) : null}
	</>
);
