import type { ComponentChildren, JSX } from 'preact';

export const CALENDAR_TIMED_GRID_OUTER_CLASS_NAME =
	'flex border-x border-t border-[var(--background-modifier-border)]';
export const CALENDAR_TIMED_GRID_AXIS_CLASS_NAME =
	'relative z-10 box-border flex w-[56px] shrink-0 flex-col border-r border-[var(--background-modifier-border)] pt-[6px] text-[10px] text-[color:var(--text-muted)]';
export const CALENDAR_TIMED_GRID_GRID_CLASS_NAME = 'relative flex';

export const renderCalendarTimedGridAxisLabels = (slotHeight: number): ComponentChildren =>
	Array.from({ length: 24 }).map((_, hour) => (
		<div key={`label-${hour}`} className="relative" style={{ height: `${slotHeight * 2}px` }}>
			<span className="absolute -top-[6px] right-2">{`${String(hour).padStart(2, '0')}:00`}</span>
		</div>
	));

export const renderCalendarTimedGridBackground = (
	columnCount: number,
	slotHeight: number,
): JSX.Element => (
	<div
		className="pointer-events-none absolute inset-0 z-0 opacity-60"
		style={{
			backgroundImage: `repeating-linear-gradient(to bottom, var(--background-modifier-border) 0, var(--background-modifier-border) 1px, transparent 1px, transparent ${slotHeight}px), repeating-linear-gradient(to right, transparent 0, transparent calc(100%/${columnCount} - 1px), var(--background-modifier-border) calc(100%/${columnCount} - 1px), var(--background-modifier-border) calc(100%/${columnCount}))`,
		}}
	/>
);
