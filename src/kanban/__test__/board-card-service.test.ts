import { findOpenKanbanLeafByPath } from '../services/card-service.ts';
import type { WorkspaceLeaf } from 'obsidian';
import { assert, test } from 'vitest';

type MockLeaf = WorkspaceLeaf;

function createLeaf(options: { viewPath?: string; statePath?: string }): MockLeaf {
	return {
		view: options.viewPath ? { file: { path: options.viewPath } } : {},
		getViewState: () => ({ state: options.statePath ? { file: options.statePath } : {} }),
	} as unknown as MockLeaf;
}

void test('findOpenKanbanLeafByPath matches leaf by active view file path', () => {
	const leaves = [
		createLeaf({ viewPath: 'boards/a.md' }),
		createLeaf({ viewPath: 'boards/b.md' }),
	] as unknown[];
	const app = {
		workspace: {
			getLeavesOfType: () => leaves,
		},
	} as const;

	const matched = findOpenKanbanLeafByPath(
		app as unknown as Parameters<typeof findOpenKanbanLeafByPath>[0],
		'timelink-kanban',
		'boards/b.md',
	);

	assert.strictEqual(matched, leaves[1]);
});

void test('findOpenKanbanLeafByPath falls back to view state path', () => {
	const leafByState = createLeaf({ statePath: 'boards/state-only.md' });
	const app = {
		workspace: {
			getLeavesOfType: () =>
				[createLeaf({ viewPath: 'boards/other.md' }), leafByState] as unknown[],
		},
	} as const;

	const matched = findOpenKanbanLeafByPath(
		app as unknown as Parameters<typeof findOpenKanbanLeafByPath>[0],
		'timelink-kanban',
		'boards/state-only.md',
	);

	assert.strictEqual(matched, leafByState);
});
