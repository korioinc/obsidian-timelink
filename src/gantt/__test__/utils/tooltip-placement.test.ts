import { resolveGanttTooltipPlacement } from '../../utils/tooltip-placement.ts';
import { assert, test } from 'vitest';

void test('resolveGanttTooltipPlacement renders the first gantt row tooltip below the bar', () => {
	assert.strictEqual(resolveGanttTooltipPlacement(0), 'below');
});

void test('resolveGanttTooltipPlacement keeps lower gantt row tooltips above the bar', () => {
	assert.strictEqual(resolveGanttTooltipPlacement(1), 'above');
	assert.strictEqual(resolveGanttTooltipPlacement(5), 'above');
});
