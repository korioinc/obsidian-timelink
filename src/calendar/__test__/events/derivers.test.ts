/* eslint-disable import/no-nodejs-modules */
import { createAllDayEventSegment as createSegment } from '../../../shared/__test__/helpers/event-factories.ts';
import { deriveDragAndResizeState } from '../../services/interaction/derivers.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

const indexByDateKey = new Map([
	['2026-03-01', 0],
	['2026-03-02', 1],
	['2026-03-03', 2],
	['2026-03-04', 3],
	['2026-03-05', 4],
	['2026-03-06', 5],
	['2026-03-07', 6],
]);

void test('deriveDragAndResizeState calculates dragRange and dragHoverIndex for all-day drag', () => {
	const dragging = createSegment(
		{ date: '2026-03-01', endDate: '2026-03-02' },
		{ start: '2026-03-01', end: '2026-03-02', span: 2 },
	);
	const state = deriveDragAndResizeState(dragging, '2026-03-04', null, null, indexByDateKey);

	assert.deepEqual(state.dragRange, { start: '2026-03-04', end: '2026-03-05' });
	assert.equal(state.dragHoverIndex, 3);
	assert.equal(state.resizeRange, null);
});

void test('deriveDragAndResizeState clamps resize end when hover date is before start', () => {
	const resizing = createSegment(
		{ date: '2026-03-03' },
		{ start: '2026-03-03', end: '2026-03-03' },
	);
	const state = deriveDragAndResizeState(null, null, resizing, '2026-03-01', indexByDateKey);

	assert.equal(state.dragRange, null);
	assert.equal(state.dragHoverIndex, null);
	assert.deepEqual(state.resizeRange, { start: '2026-03-03', end: '2026-03-03' });
});

void test('deriveDragAndResizeState returns null hover index when date key is not in map', () => {
	const dragging = createSegment(
		{ date: '2026-03-01' },
		{ start: '2026-03-01', end: '2026-03-01' },
	);
	const state = deriveDragAndResizeState(dragging, '2026-04-01', null, null, indexByDateKey);

	assert.equal(state.dragHoverIndex, null);
});
