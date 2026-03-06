import {
	createSelectionHandlers,
	createSelectionPointerUpHandler,
	EMPTY_SELECTION,
	isSelectionActive,
} from '../../services/interaction/selection.ts';
import type { SelectionState } from '../../services/interaction/selection.ts';
import type { CreateEventState } from '../../types';
import { assert, test } from 'vitest';

void test('createSelectionHandlers begins, updates, and ends normalized selection range', () => {
	let selection: SelectionState = EMPTY_SELECTION;
	const setSelection = (next: SelectionState | ((prev: SelectionState) => SelectionState)) => {
		selection = typeof next === 'function' ? next(selection) : next;
	};
	const { beginSelection, updateSelection, endSelection } = createSelectionHandlers(setSelection);

	beginSelection('2026-03-03');
	assert.strictEqual(selection.isSelecting, true);
	assert.strictEqual(selection.anchorDateKey, '2026-03-03');
	assert.strictEqual(selection.startDateKey, '2026-03-03');
	assert.strictEqual(selection.endDateKey, '2026-03-03');

	updateSelection('2026-03-01');
	assert.strictEqual(selection.hoverDateKey, '2026-03-01');
	assert.strictEqual(selection.startDateKey, '2026-03-01');
	assert.strictEqual(selection.endDateKey, '2026-03-03');

	endSelection();
	assert.deepEqual(selection, EMPTY_SELECTION);
});

void test('isSelectionActive only returns true for selecting state with anchor', () => {
	assert.strictEqual(isSelectionActive(EMPTY_SELECTION), false);
	assert.strictEqual(
		isSelectionActive({
			...EMPTY_SELECTION,
			isSelecting: true,
			anchorDateKey: null,
		}),
		false,
	);
	assert.strictEqual(
		isSelectionActive({
			...EMPTY_SELECTION,
			isSelecting: true,
			anchorDateKey: '2026-03-01',
		}),
		true,
	);
});

void test('createSelectionPointerUpHandler opens all-day create modal and clears selection', () => {
	let modal: CreateEventState | null = null;
	let modalStartDate = '';
	let modalEndDate = '';
	let modalAllDay: boolean | null = null;
	let selection: SelectionState = {
		isSelecting: true,
		anchorDateKey: '2026-03-01',
		hoverDateKey: '2026-03-01',
		startDateKey: '2026-03-01',
		endDateKey: '2026-03-01',
	};
	let endSelectionCalls = 0;

	const handlePointerUp = createSelectionPointerUpHandler(
		() => selection,
		(next) => {
			modal = next;
			modalStartDate = next.startDate;
			modalEndDate = next.endDate;
			modalAllDay = next.allDay;
		},
		() => {
			endSelectionCalls += 1;
		},
	);

	handlePointerUp();

	const createdModal = modal;
	if (!createdModal) {
		throw new Error('create modal was not set');
	}
	assert.strictEqual(modalStartDate, '2026-03-01');
	assert.strictEqual(modalEndDate, '');
	assert.strictEqual(modalAllDay, true);
	assert.strictEqual(endSelectionCalls, 1);

	selection = {
		...EMPTY_SELECTION,
		isSelecting: true,
	};
	handlePointerUp();
	assert.strictEqual(endSelectionCalls, 2);
});
