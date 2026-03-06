import type { EventSegment } from '../../../shared/event/types';
import { buildDefaultResizeCommitEntries } from '../../../shared/hooks/use-timed-grid-event-interactions.ts';
import { hasTimelineResizeChange } from '../../hooks/use-timeline-timed-interactions.ts';
import { assert, test } from 'vitest';

const createSegment = (overrides: Partial<EventSegment['event']> = {}): EventSegment => ({
	id: 'segment-1',
	event: {
		title: 'Sample event',
		allDay: false,
		date: '2026-03-02',
		endDate: '2026-03-02',
		startTime: '09:00',
		endTime: '10:00',
		taskEvent: true,
		...overrides,
	},
	location: {
		file: { path: 'calendar/sample.md' },
		lineNumber: undefined,
	},
	start: '2026-03-02',
	end: '2026-03-02',
	span: 1,
	startIndex: 0,
	endIndex: 0,
});

void test('buildTimelineResizeCommitEntries builds previous/next pair from resize hover', () => {
	const segment = createSegment();
	const entries = buildDefaultResizeCommitEntries(segment, '2026-03-02', 11 * 60);

	assert.strictEqual(entries.previous[0].endTime, '10:00');
	assert.strictEqual(entries.next[0].endTime, '11:00');
	assert.strictEqual(entries.next[1], entries.previous[1]);
});

void test('hasTimelineResizeChange returns false when resize does not change final event', () => {
	const segment = createSegment();
	const entries = buildDefaultResizeCommitEntries(segment, '2026-03-02', 10 * 60);

	assert.strictEqual(hasTimelineResizeChange(entries.next, entries.previous), false);
});

void test('hasTimelineResizeChange returns true when resize changes end date or time', () => {
	const segment = createSegment();
	const entries = buildDefaultResizeCommitEntries(segment, '2026-03-03', 30);

	assert.strictEqual(hasTimelineResizeChange(entries.next, entries.previous), true);
});
