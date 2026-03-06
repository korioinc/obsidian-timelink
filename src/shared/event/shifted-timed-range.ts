import { addDays, diffInDays, formatDateKey, MINUTES_IN_DAY, parseDateKey } from './model-utils';

type ShiftedTimedRangeParams = {
	baseStartKey: string;
	baseEndKey: string;
	hoverKey: string;
	baseStartMinutes: number;
	baseEndMinutes: number;
	hoverMinutes: number;
};

const clampMinutes = (value: number) => Math.max(0, Math.min(MINUTES_IN_DAY, value));

export const getShiftedTimedRange = ({
	baseStartKey,
	baseEndKey,
	hoverKey,
	baseStartMinutes,
	baseEndMinutes,
	hoverMinutes,
}: ShiftedTimedRangeParams) => {
	const baseSpanDays = diffInDays(parseDateKey(baseStartKey), parseDateKey(baseEndKey));
	const durationMinutes = Math.max(
		0,
		baseSpanDays * MINUTES_IN_DAY + (baseEndMinutes - baseStartMinutes),
	);
	const startMinutes = clampMinutes(baseStartMinutes + (hoverMinutes - baseStartMinutes));
	const totalEndMinutes = startMinutes + durationMinutes;
	const endDayOffset = Math.floor(totalEndMinutes / MINUTES_IN_DAY);
	const endMinutes = totalEndMinutes - endDayOffset * MINUTES_IN_DAY;
	const endDateKey = formatDateKey(addDays(parseDateKey(hoverKey), endDayOffset));
	return {
		startMinutes,
		endMinutes,
		endDateKey,
	};
};
