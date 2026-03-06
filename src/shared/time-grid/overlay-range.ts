import { compareDateKey } from '../event/model-utils';

export const normalizeDateRangeKeys = (startKey: string, endKey: string) => {
	if (compareDateKey(startKey, endKey) <= 0) {
		return { startKey, endKey };
	}
	return { startKey: endKey, endKey: startKey };
};

export const resolveRangeBounds = (
	dateKeys: string[],
	startKey: string,
	endKey: string,
): { startIndex: number; endIndex: number } | null => {
	const firstKey = dateKeys[0];
	const lastKey = dateKeys[dateKeys.length - 1];
	if (!firstKey || !lastKey) return null;
	const normalized = normalizeDateRangeKeys(startKey, endKey);
	let startIndex = dateKeys.findIndex((key) => key === normalized.startKey);
	let endIndex = dateKeys.findIndex((key) => key === normalized.endKey);

	if (startIndex < 0 && endIndex < 0) {
		const fullyBefore = compareDateKey(normalized.endKey, firstKey) < 0;
		const fullyAfter = compareDateKey(normalized.startKey, lastKey) > 0;
		return fullyBefore || fullyAfter ? null : { startIndex: 0, endIndex: dateKeys.length - 1 };
	}

	if (startIndex < 0) {
		startIndex = compareDateKey(normalized.startKey, firstKey) < 0 ? 0 : dateKeys.length - 1;
	}
	if (endIndex < 0) {
		endIndex = compareDateKey(normalized.endKey, lastKey) > 0 ? dateKeys.length - 1 : 0;
	}

	return {
		startIndex: Math.min(startIndex, endIndex),
		endIndex: Math.max(startIndex, endIndex),
	};
};
