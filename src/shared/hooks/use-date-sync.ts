import { useEffect, useRef, useState } from 'preact/hooks';

export const useSyncedCurrentDate = (initialDate?: Date, onDateChange?: (next: Date) => void) => {
	const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date());
	const currentDateRef = useRef(currentDate);
	const initialDateKeyRef = useRef(initialDate?.getTime() ?? null);

	useEffect(() => {
		if (currentDate.getTime() === currentDateRef.current.getTime()) return;
		onDateChange?.(currentDate);
		currentDateRef.current = currentDate;
	}, [currentDate, onDateChange]);

	useEffect(() => {
		const nextKey = initialDate?.getTime() ?? null;
		if (nextKey === initialDateKeyRef.current) return;
		initialDateKeyRef.current = nextKey;
		if (!initialDate) return;
		setCurrentDate(initialDate);
	}, [initialDate]);

	return { currentDate, setCurrentDate };
};
