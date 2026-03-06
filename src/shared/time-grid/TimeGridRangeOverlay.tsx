import type { TimeGridOverlaySegment } from './types';

type TimeGridRangeOverlayProps = {
	segments: TimeGridOverlaySegment[];
	columnCount: number;
	slotMinutes: number;
	slotHeight: number;
	borderColor: string;
	backgroundColor: string;
	keyPrefix: string;
};

export const TimeGridRangeOverlay = ({
	segments,
	columnCount,
	slotMinutes,
	slotHeight,
	borderColor,
	backgroundColor,
	keyPrefix,
}: TimeGridRangeOverlayProps) => {
	if (segments.length === 0) return null;
	const columnWidth = 100 / Math.max(1, columnCount);
	return (
		<div className="pointer-events-none absolute inset-0 z-10">
			{segments.map((segment) => {
				const heightMinutes = Math.max(0, segment.endMinutes - segment.startMinutes);
				return (
					<div
						key={`${keyPrefix}-${segment.columnIndex}`}
						className="absolute rounded-sm border"
						style={{
							top: `${(segment.startMinutes / slotMinutes) * slotHeight}px`,
							height: `${(heightMinutes / slotMinutes) * slotHeight}px`,
							left: `calc(${columnWidth * segment.columnIndex}% + 2px)`,
							width: `calc(${columnWidth}% - 4px)`,
							borderColor,
							backgroundColor,
						}}
					/>
				);
			})}
		</div>
	);
};
