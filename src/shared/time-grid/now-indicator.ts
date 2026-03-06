type DeriveNowIndicatorStateParams = {
	dates: Date[];
	isToday: (date: Date) => boolean;
	now: Date;
	slotMinutes: number;
	slotHeight: number;
};

export const deriveNowTop = (now: Date, slotMinutes: number, slotHeight: number): number => {
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	return (nowMinutes / slotMinutes) * slotHeight;
};

export const deriveNowIndicatorState = ({
	dates,
	isToday,
	now,
	slotMinutes,
	slotHeight,
}: DeriveNowIndicatorStateParams) => {
	const todayIndex = dates.findIndex((date) => isToday(date));
	const showNowIndicator = todayIndex >= 0 && todayIndex < dates.length;
	return {
		todayIndex,
		showNowIndicator,
		nowTop: deriveNowTop(now, slotMinutes, slotHeight),
	};
};
