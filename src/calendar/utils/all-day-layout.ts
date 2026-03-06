import type { EventSegment } from '../types';
import { EVENT_ROW_GAP, EVENT_ROW_HEIGHT } from './month-calendar-utils';
import { getWeekEventLayout } from './week-event-layout';

const DAY_EVENT_TOP_PADDING = 4;

type DeriveAllDayLayoutMetricsParams = {
	eventRows: EventSegment[][];
	weekStartIndex: number;
	weekEndIndex: number;
	requestedCapacity: number;
	minimumRowCount?: number;
};

export const deriveAllDayLayoutMetrics = ({
	eventRows,
	weekStartIndex,
	weekEndIndex,
	requestedCapacity,
	minimumRowCount = 1,
}: DeriveAllDayLayoutMetricsParams) => {
	const layout = getWeekEventLayout(
		eventRows,
		weekStartIndex,
		weekEndIndex,
		Math.max(1, requestedCapacity),
	);
	const rowCount = Math.max(layout.weekRowCount, minimumRowCount);
	const gridTemplateRows = `repeat(${rowCount}, ${EVENT_ROW_HEIGHT}px)`;
	const totalHeight =
		rowCount * EVENT_ROW_HEIGHT +
		Math.max(0, rowCount - 1) * EVENT_ROW_GAP +
		DAY_EVENT_TOP_PADDING * 2;

	return {
		layout,
		rowCount,
		gridTemplateRows,
		totalHeight,
	};
};
