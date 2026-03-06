type ResolveInitialGanttScrollLeftParams = {
	todayDayIndex: number | null;
	dayColumnWidth: number;
	labelColumnWidth: number;
	viewportWidth: number;
	totalDays: number;
	targetViewportRatio?: number;
};

export const resolveInitialGanttScrollLeft = ({
	todayDayIndex,
	dayColumnWidth,
	labelColumnWidth,
	viewportWidth,
	totalDays,
	targetViewportRatio = 0.35,
}: ResolveInitialGanttScrollLeftParams): number => {
	if (todayDayIndex === null) return 0;
	const trackViewportWidth = Math.max(0, viewportWidth - labelColumnWidth);
	if (trackViewportWidth <= 0) return 0;
	const maxScrollLeft = Math.max(0, totalDays * dayColumnWidth - trackViewportWidth);
	const targetOffset = trackViewportWidth * targetViewportRatio;
	const rawScrollLeft = todayDayIndex * dayColumnWidth - targetOffset;
	return Math.max(0, Math.min(maxScrollLeft, Math.round(rawScrollLeft)));
};
