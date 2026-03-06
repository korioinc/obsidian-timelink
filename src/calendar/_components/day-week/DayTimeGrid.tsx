import { SingleColumnTimedGrid } from '../../../shared/time-grid/SingleColumnTimedGrid';
import {
	buildSingleColumnTimedGridState,
	type SingleColumnTimedViewProps,
} from '../../../shared/time-grid/single-column-view-types';
import {
	CALENDAR_TIMED_GRID_AXIS_CLASS_NAME,
	CALENDAR_TIMED_GRID_GRID_CLASS_NAME,
	CALENDAR_TIMED_GRID_OUTER_CLASS_NAME,
	renderCalendarTimedGridAxisLabels,
	renderCalendarTimedGridBackground,
} from './timed-grid-preset';

type DayTimeGridProps = SingleColumnTimedViewProps;

export const DayTimeGrid = (props: DayTimeGridProps) => {
	const state = buildSingleColumnTimedGridState(props);
	return (
		<SingleColumnTimedGrid
			state={state}
			variant="calendar"
			outerClassName={CALENDAR_TIMED_GRID_OUTER_CLASS_NAME}
			axisClassName={CALENDAR_TIMED_GRID_AXIS_CLASS_NAME}
			gridClassName={CALENDAR_TIMED_GRID_GRID_CLASS_NAME}
			renderAxisLabels={({ slotHeight }) => renderCalendarTimedGridAxisLabels(slotHeight)}
			renderBackground={({ slotHeight }) => renderCalendarTimedGridBackground(1, slotHeight)}
		/>
	);
};
