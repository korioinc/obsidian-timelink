type MonthAllDayPlacementLike = {
	spanInWeek: number;
	isSpanStart: boolean;
	isSpanEnd: boolean;
};

export const getMonthAllDayMarginClass = (placement: MonthAllDayPlacementLike): string => {
	if (placement.spanInWeek <= 1) return 'mx-1';
	const hasLeftEdge = placement.isSpanStart;
	const hasRightEdge = placement.isSpanEnd;
	if (hasLeftEdge && hasRightEdge) return 'mx-1';
	if (hasLeftEdge) return 'ml-1';
	if (hasRightEdge) return 'mr-1';
	return '';
};
