import { SingleColumnTimedGrid } from '../../shared/time-grid/SingleColumnTimedGrid';
import {
	buildSingleColumnTimedGridState,
	type SingleColumnTimedViewProps,
} from '../../shared/time-grid/single-column-view-types';

type TimelineTimeGridProps = SingleColumnTimedViewProps;

export const TimelineTimeGrid = (props: TimelineTimeGridProps) => {
	const state = buildSingleColumnTimedGridState(props);
	return (
		<SingleColumnTimedGrid
			state={state}
			variant="timeline"
			outerClassName="flex"
			axisClassName="relative z-10 box-border flex w-[20px] shrink-0 flex-col border-t border-r border-l border-[var(--background-modifier-border)] pt-[6px] text-[10px] text-[color:var(--text-muted)]"
			gridClassName="relative flex border-t border-r border-[var(--background-modifier-border)]"
			renderAxisLabels={({ slotHeight, slotMinutes }) => {
				const slotsPerHour = Math.max(1, Math.round(60 / slotMinutes));
				const hourBlockHeight = slotHeight * slotsPerHour;
				return Array.from({ length: 24 }).map((_, hour) => (
					<div
						key={`label-${hour}`}
						className="relative"
						style={{ height: `${hourBlockHeight}px` }}
					>
						<span className="absolute -top-[6px] right-1">{String(hour)}</span>
					</div>
				));
			}}
			renderBackground={({ slotHeight, slotMinutes }) => {
				const slotsPerHour = Math.max(1, Math.round(60 / slotMinutes));
				const hourBlockHeight = slotHeight * slotsPerHour;
				const halfHourHeight = hourBlockHeight / 2;
				return (
					<>
						<div
							className="pointer-events-none absolute inset-0 z-0 opacity-60"
							style={{
								backgroundImage: `repeating-linear-gradient(to bottom, var(--background-modifier-border) 0, var(--background-modifier-border) 1px, transparent 1px, transparent ${hourBlockHeight}px)`,
							}}
						/>
						<div className="pointer-events-none absolute inset-0 z-0 opacity-60">
							{Array.from({ length: 24 * 2 - 1 }).map((_, index) => {
								const lineIndex = index + 1;
								if (lineIndex % 2 === 0) {
									return null;
								}
								return (
									<div
										key={`half-hour-${lineIndex}`}
										className="absolute right-0 left-0 border-t border-dashed border-[var(--background-modifier-border)]"
										style={{ top: `${lineIndex * halfHourHeight}px` }}
									/>
								);
							})}
						</div>
					</>
				);
			}}
		/>
	);
};
