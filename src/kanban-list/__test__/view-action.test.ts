import { runKanbanListAction } from '../view.tsx';
import { afterEach, assert, beforeEach, expect, test, vi } from 'vitest';

const harness = vi.hoisted(() => ({
	notices: [] as string[],
}));

vi.mock('../../shared/services/notice-service.ts', () => ({
	createNotice: () => (message: string) => {
		harness.notices.push(message);
	},
}));

beforeEach(() => {
	harness.notices.length = 0;
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

void test.each([
	['Failed to open kanban board', 'Failed to open kanban board.'],
	['Failed to refresh kanban boards', 'Failed to refresh kanban boards.'],
])('failed list action is reported and absorbed: %s', async (label, message) => {
	await expect(
		runKanbanListAction(label, message, () => Promise.reject(new Error('failed'))),
	).resolves.toBeUndefined();

	assert.deepEqual(harness.notices, [message]);
	assert.strictEqual(vi.mocked(console.error).mock.calls.length, 1);
});
