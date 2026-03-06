import { createPointerSelectionHandlers } from '../../../shared/hooks/time-grid-selection-handlers.ts';
import {
	deriveTimeSelectionStartState,
	patchTimeSelectionHover,
} from '../../../shared/hooks/time-grid-selection-handlers.ts';
import {
	buildTimedCreateModalFromRange,
	resolveTimeSelectionPointerInfo,
} from '../../../shared/hooks/use-time-grid-selection.ts';
import type { TimeSelectionState } from '../../types';
import { assert, test } from 'vitest';

const createTarget = () => {
	const calls: number[] = [];
	const rect = {
		left: 100,
		top: 200,
		width: 700,
		height: 560,
		x: 100,
		y: 200,
		right: 800,
		bottom: 760,
		toJSON: () => ({}),
	} as DOMRect;
	const target = {
		getBoundingClientRect: () => rect,
		setPointerCapture: (pointerId: number) => {
			calls.push(pointerId);
		},
	};
	return { target, calls };
};

const createPointerEvent = (overrides: Partial<PointerEvent> = {}, target?: unknown) =>
	({
		button: 0,
		pointerId: 7,
		clientX: 350,
		clientY: 280,
		currentTarget: (target ?? null) as EventTarget | null,
		...overrides,
	}) as PointerEvent;

void test('resolveTimeSelectionPointerInfo maps pointer to date/minutes and target', () => {
	const { target } = createTarget();
	const event = createPointerEvent({}, target);
	const info = resolveTimeSelectionPointerInfo({
		event,
		dateKeys: [
			'2026-03-01',
			'2026-03-02',
			'2026-03-03',
			'2026-03-04',
			'2026-03-05',
			'2026-03-06',
			'2026-03-07',
		],
		slotHeight: 28,
	});

	assert.ok(info);
	assert.strictEqual(info.dateKey, '2026-03-03');
	assert.strictEqual(info.minutes, 60);
	assert.strictEqual(info.target, target);
});

void test('deriveTimeSelectionStartState and patchTimeSelectionHover build expected state', () => {
	const start = deriveTimeSelectionStartState('2026-03-01', 9 * 60);
	const next = patchTimeSelectionHover(start, '2026-03-02', 10 * 60);

	assert.deepEqual(start, {
		isSelecting: true,
		anchorDateKey: '2026-03-01',
		anchorMinutes: 9 * 60,
		hoverDateKey: '2026-03-01',
		hoverMinutes: 9 * 60,
	});
	assert.strictEqual(next.anchorDateKey, '2026-03-01');
	assert.strictEqual(next.anchorMinutes, 9 * 60);
	assert.strictEqual(next.hoverDateKey, '2026-03-02');
	assert.strictEqual(next.hoverMinutes, 10 * 60);
});

void test('createPointerSelectionHandlers pointer down starts selection and captures pointer', () => {
	const { target, calls } = createTarget();
	const updates: TimeSelectionState[] = [];
	const setTimeSelection = (
		next: TimeSelectionState | ((prev: TimeSelectionState) => TimeSelectionState),
	) => {
		if (typeof next !== 'function') {
			updates.push(next);
		}
	};

	const handlers = createPointerSelectionHandlers({
		timeSelection: {
			isSelecting: false,
			anchorDateKey: null,
			anchorMinutes: null,
			hoverDateKey: null,
			hoverMinutes: null,
		},
		isSelectionBlocked: false,
		setTimeSelection,
		resolvePointerInfo: (event) =>
			resolveTimeSelectionPointerInfo({
				event,
				dateKeys: [
					'2026-03-01',
					'2026-03-02',
					'2026-03-03',
					'2026-03-04',
					'2026-03-05',
					'2026-03-06',
					'2026-03-07',
				],
				slotHeight: 28,
			}),
	});

	handlers.handleTimeGridPointerDown(createPointerEvent({}, target));

	assert.deepEqual(calls, [7]);
	assert.strictEqual(updates.length, 1);
	assert.strictEqual(updates[0]?.anchorDateKey, '2026-03-03');
	assert.strictEqual(updates[0]?.anchorMinutes, 60);
	assert.strictEqual(updates[0]?.hoverDateKey, '2026-03-03');
	assert.strictEqual(updates[0]?.hoverMinutes, 60);
});

void test('createPointerSelectionHandlers pointer move updates hover when selection is active', () => {
	const { target } = createTarget();
	const updates: Array<TimeSelectionState | ((prev: TimeSelectionState) => TimeSelectionState)> =
		[];
	const setTimeSelection = (
		next: TimeSelectionState | ((prev: TimeSelectionState) => TimeSelectionState),
	) => {
		updates.push(next);
	};

	const handlers = createPointerSelectionHandlers({
		timeSelection: {
			isSelecting: true,
			anchorDateKey: '2026-03-01',
			anchorMinutes: 9 * 60,
			hoverDateKey: '2026-03-01',
			hoverMinutes: 9 * 60,
		},
		isSelectionBlocked: false,
		setTimeSelection,
		resolvePointerInfo: (event) =>
			resolveTimeSelectionPointerInfo({
				event,
				dateKeys: [
					'2026-03-01',
					'2026-03-02',
					'2026-03-03',
					'2026-03-04',
					'2026-03-05',
					'2026-03-06',
					'2026-03-07',
				],
				slotHeight: 28,
			}),
	});

	handlers.handleTimeGridPointerMove(
		createPointerEvent({ clientX: 760, clientY: 340, pointerId: 11 }, target),
	);

	assert.strictEqual(updates.length, 1);
	const updater = updates[0];
	assert.strictEqual(typeof updater, 'function');
	const next = (updater as (prev: TimeSelectionState) => TimeSelectionState)({
		isSelecting: true,
		anchorDateKey: '2026-03-01',
		anchorMinutes: 9 * 60,
		hoverDateKey: '2026-03-01',
		hoverMinutes: 9 * 60,
	});
	assert.strictEqual(next.hoverDateKey, '2026-03-07');
	assert.strictEqual(next.hoverMinutes, 150);
});

void test('createPointerSelectionHandlers ignores blocked or non-primary pointer down', () => {
	const { target, calls } = createTarget();
	let called = 0;
	const setTimeSelection = () => {
		called += 1;
	};
	const blockedHandlers = createPointerSelectionHandlers({
		timeSelection: {
			isSelecting: false,
			anchorDateKey: null,
			anchorMinutes: null,
			hoverDateKey: null,
			hoverMinutes: null,
		},
		isSelectionBlocked: true,
		setTimeSelection,
		resolvePointerInfo: (event) =>
			resolveTimeSelectionPointerInfo({
				event,
				dateKeys: ['2026-03-01'],
				slotHeight: 28,
			}),
	});
	blockedHandlers.handleTimeGridPointerDown(createPointerEvent({}, target));

	const nonPrimaryHandlers = createPointerSelectionHandlers({
		timeSelection: {
			isSelecting: false,
			anchorDateKey: null,
			anchorMinutes: null,
			hoverDateKey: null,
			hoverMinutes: null,
		},
		isSelectionBlocked: false,
		setTimeSelection,
		resolvePointerInfo: (event) =>
			resolveTimeSelectionPointerInfo({
				event,
				dateKeys: ['2026-03-01'],
				slotHeight: 28,
			}),
	});
	nonPrimaryHandlers.handleTimeGridPointerDown(createPointerEvent({ button: 1 }, target));

	assert.strictEqual(called, 0);
	assert.deepEqual(calls, []);
});

void test('buildTimedCreateModalFromRange converts 24:00 boundary to next-day 00:00', () => {
	const modal = buildTimedCreateModalFromRange({
		startDateKey: '2026-03-05',
		endDateKey: '2026-03-05',
		startMinutes: 23 * 60 + 30,
		endMinutes: 24 * 60,
	});

	assert.strictEqual(modal.startDate, '2026-03-05');
	assert.strictEqual(modal.startTime, '23:30');
	assert.strictEqual(modal.endDate, '2026-03-06');
	assert.strictEqual(modal.endTime, '00:00');
});
