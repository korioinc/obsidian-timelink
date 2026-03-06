/* eslint-disable import/no-nodejs-modules */
import { createTimedEventSegment as createSegment } from '../../../shared/__test__/helpers/event-factories.ts';
import {
	deriveTimedDragStartState,
	deriveTimedResizeStartState,
	resolveTimedColor,
} from '../../../shared/event/timed-interaction-state.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

void test('deriveTimedResizeStartState returns hover date, snapped minutes source, and color', () => {
	const segment = createSegment({ endTime: '10:30', color: '#00aa00' }, { end: '2026-03-02' });
	const state = deriveTimedResizeStartState(segment);

	assert.equal(state.hoverDateKey, '2026-03-02');
	assert.equal(state.hoverMinutes, 10 * 60 + 30);
	assert.equal(state.color, '#00aa00');
});

void test('deriveTimedDragStartState returns segment start and start-time minutes', () => {
	const segment = createSegment({ startTime: '07:30', color: '#2244ff' }, { start: '2026-03-05' });
	const state = deriveTimedDragStartState(segment);

	assert.equal(state.hoverDateKey, '2026-03-05');
	assert.equal(state.hoverMinutes, 7 * 60 + 30);
	assert.equal(state.color, '#2244ff');
});

void test('resolveTimedColor prefers preview color then segment color then default', () => {
	const segment = createSegment({ color: '#333333' });

	assert.equal(resolveTimedColor('#111111', segment, '#999999'), '#111111');
	assert.equal(resolveTimedColor(null, segment, '#999999'), '#333333');
	assert.equal(resolveTimedColor(null, createSegment({ color: undefined }), '#999999'), '#999999');
	assert.equal(resolveTimedColor(null, null, '#999999'), '#999999');
});
