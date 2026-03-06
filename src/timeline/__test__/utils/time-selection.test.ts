import {
	getMinutesFromPointer,
	normalizeTimeSelection,
	snapMinutes,
} from '../../../shared/event/time-grid-interactions.ts';
import { TIMELINE_SLOT_MINUTES } from '../../constants.ts';
import { assert, test } from 'vitest';

const rect = {
	left: 100,
	top: 200,
	width: 300,
	height: 720,
} as DOMRect;

void test('normalizeTimelineTimeSelection uses timeline step and minimum duration', () => {
	const range = normalizeTimeSelection(
		{
			isSelecting: true,
			anchorDateKey: '2026-03-02',
			anchorMinutes: 9 * 60,
			hoverDateKey: '2026-03-02',
			hoverMinutes: 9 * 60 + 2,
		},
		TIMELINE_SLOT_MINUTES,
	);

	assert.ok(range);
	assert.strictEqual(range.startMinutes, 9 * 60);
	assert.strictEqual(range.endMinutes, 9 * 60 + TIMELINE_SLOT_MINUTES);
});

void test('resolveTimelineMinutesFromPointer snaps with timeline slot granularity', () => {
	const minutes = snapMinutes(
		getMinutesFromPointer(241, rect, 14, TIMELINE_SLOT_MINUTES),
		TIMELINE_SLOT_MINUTES,
	);
	assert.strictEqual(minutes, 20);
});
