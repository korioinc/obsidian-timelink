import {
	createResizeEffectHandlers,
	handleResizeStartFactory,
} from '../../services/interaction/resize.ts';
import type { CalendarEvent, EventSegment } from '../../types';
import { assert, test } from 'vitest';

const createSegment = (
	eventOverrides: Partial<CalendarEvent> = {},
	segmentOverrides: Partial<EventSegment> = {},
): EventSegment => {
	const baseEvent: CalendarEvent = {
		title: 'Sample event',
		allDay: true,
		date: '2026-03-03',
	};
	const event = { ...baseEvent, ...eventOverrides };
	const start = event.date ?? '2026-03-03';
	const end = event.endDate ?? start;
	return {
		id: 'segment-1',
		event,
		location: {
			file: { path: 'calendar/sample.md' },
			lineNumber: undefined,
		},
		start,
		end,
		span: 1,
		startIndex: 0,
		endIndex: 0,
		...segmentOverrides,
	};
};

void test('createResizeEffectHandlers returns null when no active resizing exists', () => {
	const handlers = createResizeEffectHandlers(
		null,
		null,
		() => null,
		() => undefined,
		() => undefined,
		() => undefined,
		{ current: true },
	);
	assert.strictEqual(handlers, null);
});

void test('createResizeEffectHandlers updates hover on pointer move and clamps end date on pointer up', async () => {
	const originalWindow = (globalThis as { window?: typeof globalThis }).window;
	(globalThis as { window: typeof globalThis }).window = globalThis;
	try {
		const resizing = createSegment({ date: '2026-03-03', endDate: '2026-03-05' });
		let hover: string | null = '2026-03-04';
		let activeResizing: EventSegment | null = resizing;
		let previousDate: string | undefined;
		let nextDate: string | undefined;
		let nextEndDate: string | null | undefined;
		const isResizingRef = { current: true };

		const handlers = createResizeEffectHandlers(
			resizing,
			'2026-03-01',
			(clientX) => (clientX > 300 ? '2026-03-06' : null),
			(next) => {
				hover = next;
			},
			(next, previous) => {
				previousDate = previous[0].date;
				nextDate = next[0].date;
				nextEndDate = next[0].endDate;
			},
			(next) => {
				activeResizing = next;
			},
			isResizingRef,
		);

		assert.ok(handlers);
		handlers.handlePointerMove({ clientX: 500, clientY: 200 } as PointerEvent);
		assert.strictEqual(hover, '2026-03-06');

		handlers.handlePointerUp();
		await new Promise((resolve) => setTimeout(resolve, 0));

		assert.strictEqual(previousDate, '2026-03-03');
		assert.strictEqual(nextDate, '2026-03-03');
		assert.strictEqual(nextEndDate, undefined);
		assert.strictEqual(activeResizing, null);
		assert.strictEqual(hover, null);
		assert.strictEqual(isResizingRef.current, false);
	} finally {
		if (originalWindow) {
			(globalThis as { window: typeof globalThis }).window = originalWindow;
		} else {
			delete (globalThis as { window?: typeof globalThis }).window;
		}
	}
});

void test('handleResizeStartFactory stores target segment and initial hover date', () => {
	const segment = createSegment({ date: '2026-03-03', endDate: '2026-03-04' });
	let nextResizing: EventSegment | null = null;
	let hover: string | null = null;
	const handleResizeStart = handleResizeStartFactory(
		(next) => {
			nextResizing = next;
		},
		(next) => {
			hover = next;
		},
	);

	handleResizeStart(segment);

	assert.strictEqual(nextResizing, segment);
	assert.strictEqual(hover, '2026-03-04');
});
