import { getMonthAllDayMarginClass } from '../../../utils/all-day-event-bar.ts';
import { assert, test } from 'vitest';

type PlacementLike = {
	spanInWeek: number;
	isSpanStart: boolean;
	isSpanEnd: boolean;
};

void test('getMonthAllDayMarginClass returns symmetric margin for single-day placement', () => {
	const placement: PlacementLike = {
		spanInWeek: 1,
		isSpanStart: true,
		isSpanEnd: true,
	};

	assert.strictEqual(getMonthAllDayMarginClass(placement), 'mx-1');
});

void test('getMonthAllDayMarginClass returns left-only margin for span start', () => {
	const placement: PlacementLike = {
		spanInWeek: 3,
		isSpanStart: true,
		isSpanEnd: false,
	};

	assert.strictEqual(getMonthAllDayMarginClass(placement), 'ml-1');
});

void test('getMonthAllDayMarginClass returns right-only margin for span end', () => {
	const placement: PlacementLike = {
		spanInWeek: 3,
		isSpanStart: false,
		isSpanEnd: true,
	};

	assert.strictEqual(getMonthAllDayMarginClass(placement), 'mr-1');
});

void test('getMonthAllDayMarginClass returns no margin for middle span segment', () => {
	const placement: PlacementLike = {
		spanInWeek: 3,
		isSpanStart: false,
		isSpanEnd: false,
	};

	assert.strictEqual(getMonthAllDayMarginClass(placement), '');
});
