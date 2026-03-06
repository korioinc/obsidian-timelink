export const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const EVENT_ROW_HEIGHT = 20;
export const EVENT_ROW_GAP = 2;
export const EVENT_ROW_SPACING = EVENT_ROW_HEIGHT + EVENT_ROW_GAP;

export const formatMonthTitle = (date: Date): string => {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	return `${month} / ${year}`;
};

export const formatWeekTitle = (date: Date): string => {
	const start = startOfWeek(date);
	const end = addDays(start, 6);
	const year = end.getFullYear();
	const month = String(end.getMonth() + 1).padStart(2, '0');
	const startDay = String(start.getDate()).padStart(2, '0');
	const endDay = String(end.getDate()).padStart(2, '0');
	return `${startDay} - ${endDay}, ${month} / ${year}`;
};

export const formatDayTitle = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${month} / ${day} / ${year}`;
};

const startOfWeek = (date: Date): Date => {
	const start = new Date(date);
	const day = start.getDay();
	start.setDate(start.getDate() - day);
	start.setHours(0, 0, 0, 0);
	return start;
};

const addDays = (date: Date, days: number): Date => {
	const copy = new Date(date);
	copy.setDate(copy.getDate() + days);
	return copy;
};
