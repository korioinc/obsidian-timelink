import { compareEventStartTimeThenTitle } from './event-order';

type MoreMenuPlacementLike = {
	weekRow: number;
	columnStart: number;
	spanInWeek: number;
	segment: {
		event: {
			startTime?: string;
			title?: string;
		};
	};
};

export const orderMoreMenuPlacements = <T extends MoreMenuPlacementLike>(placements: T[]): T[] => {
	return [...placements].sort((a, b) => {
		if (a.weekRow !== b.weekRow) return a.weekRow - b.weekRow;
		if (a.columnStart !== b.columnStart) return a.columnStart - b.columnStart;
		if (a.spanInWeek !== b.spanInWeek) return b.spanInWeek - a.spanInWeek;
		return compareEventStartTimeThenTitle(
			a.segment.event.startTime,
			b.segment.event.startTime,
			a.segment.event.title,
			b.segment.event.title,
		);
	});
};
