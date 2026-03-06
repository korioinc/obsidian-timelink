import { resolveInitialGanttScrollLeft } from '../../utils/initial-scroll.ts';
import { assert, test } from 'vitest';

void test('resolveInitialGanttScrollLeft positions today near the left-center of the visible track', () => {
	const scrollLeft = resolveInitialGanttScrollLeft({
		todayDayIndex: 33,
		dayColumnWidth: 20,
		labelColumnWidth: 360,
		viewportWidth: 1200,
		totalDays: 365,
	});

	assert.strictEqual(scrollLeft, 366);
});

void test('resolveInitialGanttScrollLeft clamps to zero near the start of the year', () => {
	const scrollLeft = resolveInitialGanttScrollLeft({
		todayDayIndex: 1,
		dayColumnWidth: 20,
		labelColumnWidth: 360,
		viewportWidth: 1200,
		totalDays: 365,
	});

	assert.strictEqual(scrollLeft, 0);
});

void test('resolveInitialGanttScrollLeft returns zero when today index is unavailable', () => {
	const scrollLeft = resolveInitialGanttScrollLeft({
		todayDayIndex: null,
		dayColumnWidth: 20,
		labelColumnWidth: 360,
		viewportWidth: 1200,
		totalDays: 365,
	});

	assert.strictEqual(scrollLeft, 0);
});

void test('resolveInitialGanttScrollLeft clamps to the end of the track for late-year dates', () => {
	const scrollLeft = resolveInitialGanttScrollLeft({
		todayDayIndex: 360,
		dayColumnWidth: 20,
		labelColumnWidth: 360,
		viewportWidth: 1200,
		totalDays: 365,
	});

	assert.strictEqual(scrollLeft, 6460);
});
