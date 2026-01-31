export type DayCellData = {
	date: Date;
	inMonth: boolean;
};

const startOfDay = (date: Date): Date => {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (date: Date, days: number): Date => {
	const copy = new Date(date);
	copy.setDate(copy.getDate() + days);
	return copy;
};

export const buildMonthGrid = (
	year: number,
	month: number,
	weekStartsOn: number,
): DayCellData[] => {
	const firstOfMonth = new Date(year, month - 1, 1);
	const firstDay = firstOfMonth.getDay();
	const offset = (firstDay - weekStartsOn + 7) % 7;
	const start = addDays(firstOfMonth, -offset);
	const grid: DayCellData[] = [];
	for (let i = 0; i < 42; i += 1) {
		const date = startOfDay(addDays(start, i));
		grid.push({ date, inMonth: date.getMonth() === month - 1 });
	}
	return grid;
};

export const buildWeekGrid = (date: Date, weekStartsOn: number): DayCellData[] => {
	const anchor = startOfDay(date);
	const day = anchor.getDay();
	const offset = (day - weekStartsOn + 7) % 7;
	const start = addDays(anchor, -offset);
	const grid: DayCellData[] = [];
	for (let i = 0; i < 7; i += 1) {
		const cellDate = startOfDay(addDays(start, i));
		grid.push({ date: cellDate, inMonth: cellDate.getMonth() === anchor.getMonth() });
	}
	return grid;
};

export const isToday = (date: Date): boolean => {
	const today = new Date();
	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	);
};
