import { createTimedEventSegment as createSegment } from '../../../shared/__test__/helpers/event-factories.ts';
import {
	deriveTimedDragStartState,
	deriveTimedResizeStartState,
	resolveTimedColor,
} from '../../../shared/event/timed-interaction-state.ts';
import { assert, test } from 'vitest';

void test('deriveTimedResizeStartState returns hover date, snapped minutes source, and color', () => {
	const segment = createSegment({ endTime: '10:30', color: '#00aa00' }, { end: '2026-03-02' });
	const state = deriveTimedResizeStartState(segment);

	assert.strictEqual(state.hoverDateKey, '2026-03-02');
	assert.strictEqual(state.hoverMinutes, 10 * 60 + 30);
	assert.strictEqual(state.color, '#00aa00');
});

void test('deriveTimedDragStartState returns segment start and start-time minutes', () => {
	const segment = createSegment({ startTime: '07:30', color: '#2244ff' }, { start: '2026-03-05' });
	const state = deriveTimedDragStartState(segment);

	assert.strictEqual(state.hoverDateKey, '2026-03-05');
	assert.strictEqual(state.hoverMinutes, 7 * 60 + 30);
	assert.strictEqual(state.color, '#2244ff');
});

void test('resolveTimedColor prefers preview color then segment color then default', () => {
	const segment = createSegment({ color: '#333333' });

	assert.strictEqual(resolveTimedColor('#111111', segment, '#999999'), '#111111');
	assert.strictEqual(resolveTimedColor(null, segment, '#999999'), '#333333');
	assert.strictEqual(
		resolveTimedColor(null, createSegment({ color: undefined }), '#999999'),
		'#999999',
	);
	assert.strictEqual(resolveTimedColor(null, null, '#999999'), '#999999');
});
