import type { EventSegment } from '../types';
import { orderMoreMenuPlacements } from './more-menu-order';
import { getWeekEventLayout } from './week-event-layout';

type MoreMenuState = { dateKey: string } | null;

type BuildMoreMenuEventsParams = {
	eventRows: EventSegment[][];
	indexByDateKey: Map<string, number>;
	moreMenu: MoreMenuState;
};

export const buildMoreMenuEvents = ({
	eventRows,
	indexByDateKey,
	moreMenu,
}: BuildMoreMenuEventsParams): Array<{
	segment: EventSegment;
	location: EventSegment['location'];
}> => {
	if (!moreMenu) return [];
	const index = indexByDateKey.get(moreMenu.dateKey);
	if (index === undefined) return [];
	const weekStartIndex = Math.floor(index / 7) * 7;
	const weekEndIndex = weekStartIndex + 6;
	const layout = getWeekEventLayout(
		eventRows,
		weekStartIndex,
		weekEndIndex,
		Number.MAX_SAFE_INTEGER,
	);
	const dayOffset = index - weekStartIndex;
	const isInDay = (placement: { columnStart: number; spanInWeek: number }) => {
		const startOffset = Math.max(0, placement.columnStart - 1);
		const endOffset = Math.min(6, startOffset + placement.spanInWeek - 1);
		return dayOffset >= startOffset && dayOffset <= endOffset;
	};
	const orderedPlacements = orderMoreMenuPlacements(
		[...layout.multiDayPlacements, ...layout.singleDayPlacements].filter(isInDay),
	);
	return orderedPlacements.map((placement) => ({
		segment: placement.segment,
		location: placement.segment.location,
	}));
};
