import { deriveTimedEventVisualState } from '../../../../shared/event/timed-visual-model.ts';
import { assert, test } from 'vitest';

type TimedEventVisualStateParams = Parameters<typeof deriveTimedEventVisualState>[0];

const createBaseParams = (
	overrides: Partial<TimedEventVisualStateParams> = {},
): TimedEventVisualStateParams => ({
	cellDateKey: '2026-03-01',
	eventStartMinutes: 540,
	eventEndMinutes: 600,
	placementStartMinutes: 540,
	placementEndMinutes: 600,
	slotMinutes: 30,
	slotHeight: 28,
	isDraggingEvent: false,
	isResizingEvent: false,
	timedDragStartMinutes: null,
	timedDragEndMinutes: null,
	timedResizeRange: null,
	resizeRangeKeys: null,
	...overrides,
});

void test('deriveTimedEventVisualState uses drag range for labels and visual bounds', () => {
	const result = deriveTimedEventVisualState(
		createBaseParams({
			isDraggingEvent: true,
			timedDragStartMinutes: 660,
			timedDragEndMinutes: 750,
		}),
	);

	assert.strictEqual(result.labelStartMinutes, 660);
	assert.strictEqual(result.labelEndMinutes, 750);
	assert.strictEqual(result.visualTop, (660 / 30) * 28);
	assert.strictEqual(result.visualHeight, 40);
});

void test('deriveTimedEventVisualState applies same-day resize range', () => {
	const result = deriveTimedEventVisualState(
		createBaseParams({
			isResizingEvent: true,
			timedResizeRange: {
				startDateKey: '2026-03-01',
				endDateKey: '2026-03-01',
				startMinutes: 540,
				endMinutes: 690,
			},
			resizeRangeKeys: { startKey: '2026-03-01', endKey: '2026-03-01' },
		}),
	);

	assert.strictEqual(result.labelStartMinutes, 540);
	assert.strictEqual(result.labelEndMinutes, 690);
	assert.strictEqual(result.visualTop, (540 / 30) * 28);
	assert.strictEqual(result.visualHeight, ((690 - 540) / 30) * 28);
});

void test('deriveTimedEventVisualState clamps out-of-range visual bounds', () => {
	const result = deriveTimedEventVisualState(
		createBaseParams({
			timedDragStartMinutes: -30,
			timedDragEndMinutes: 1500,
		}),
	);

	assert.strictEqual(result.visualTop, 0);
	assert.strictEqual(result.visualHeight, (1440 / 30) * 28);
});
