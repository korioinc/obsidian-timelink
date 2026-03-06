/* eslint-disable import/no-nodejs-modules */
import { findOpenKanbanLeafByPath } from '../services/card-service.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

type MockLeaf = {
	view: { file?: { path?: string } | null };
	getViewState: () => { state?: { file?: string; filePath?: string } };
};

function createLeaf(options: { viewPath?: string; statePath?: string }): MockLeaf {
	return {
		view: options.viewPath ? { file: { path: options.viewPath } } : {},
		getViewState: () => ({ state: options.statePath ? { file: options.statePath } : {} }),
	};
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

	assert.equal(matched, leaves[1]);
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

	assert.equal(matched, leafByState);
});
