import { canOfferOpenActiveKanbanBoard } from './kanban-command-policy.ts';
import { assert, test } from 'vitest';

void test('an uncached candidate remains available for inspection by the open-board command', () => {
	assert.strictEqual(canOfferOpenActiveKanbanBoard('allow'), true);
	assert.strictEqual(canOfferOpenActiveKanbanBoard('inspect'), true);
	assert.strictEqual(canOfferOpenActiveKanbanBoard('deny'), false);
});
