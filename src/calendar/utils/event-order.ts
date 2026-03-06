const compareTitle = (aTitle?: string | null, bTitle?: string | null): number => {
	const normalizedA = (aTitle ?? '').toLowerCase();
	const normalizedB = (bTitle ?? '').toLowerCase();
	return normalizedA.localeCompare(normalizedB);
};

export const compareEventTimeMinutesThenTitle = (
	aTime: number | null,
	bTime: number | null,
	aTitle?: string | null,
	bTitle?: string | null,
): number => {
	if (aTime !== null || bTime !== null) {
		if (aTime === null) return 1;
		if (bTime === null) return -1;
		if (aTime !== bTime) return aTime - bTime;
	}
	return compareTitle(aTitle, bTitle);
};

export const compareEventStartTimeThenTitle = (
	aTime?: string | null,
	bTime?: string | null,
	aTitle?: string | null,
	bTitle?: string | null,
): number => {
	if (aTime !== bTime) {
		if (!aTime) return 1;
		if (!bTime) return -1;
		return aTime.localeCompare(bTime);
	}
	return compareTitle(aTitle, bTitle);
};
