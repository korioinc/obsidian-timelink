import {
	KanbanMarkdownModeTracker,
	openTrackedMarkdownView,
} from '../services/markdown-mode-service.ts';
import { assert, expect, test, vi } from 'vitest';

void test('KanbanMarkdownModeTracker scopes a markdown override to one leaf and file', () => {
	const tracker = new KanbanMarkdownModeTracker();
	tracker.set('leaf-1', 'boards/one.md', 'readonly');

	assert.strictEqual(tracker.get('leaf-1', 'boards/one.md'), 'readonly');
	assert.strictEqual(tracker.get('leaf-2', 'boards/one.md'), undefined);
	assert.strictEqual(tracker.get('leaf-1', 'notes/two.md'), undefined);
	assert.strictEqual(tracker.get('leaf-1', 'boards/one.md'), undefined);
});

void test('openTrackedMarkdownView retains the requested mode after a successful transition', async () => {
	const tracker = new KanbanMarkdownModeTracker();
	const setViewState = vi.fn((_state: unknown) => Promise.resolve());
	const leaf = {
		id: 'leaf-1',
		view: { getState: () => ({ file: 'boards/one.md', mode: 'source' }) },
		setViewState,
	};

	await openTrackedMarkdownView(tracker, leaf as never, { readOnly: true });

	assert.strictEqual(tracker.get('leaf-1', 'boards/one.md'), 'readonly');
	assert.deepEqual(setViewState.mock.calls[0]?.[0], {
		type: 'markdown',
		state: { file: 'boards/one.md', mode: 'preview' },
	});
});

void test('openTrackedMarkdownView clears its override when the transition fails', async () => {
	const tracker = new KanbanMarkdownModeTracker();
	const leaf = {
		id: 'leaf-1',
		view: { getState: () => ({ file: 'boards/one.md' }) },
		setViewState: () => Promise.reject(new Error('transition failed')),
	};

	await expect(
		openTrackedMarkdownView(tracker, leaf as never, { readOnly: false }),
	).rejects.toThrow('transition failed');

	assert.strictEqual(tracker.get('leaf-1', 'boards/one.md'), undefined);
});

void test('a late failed transition cannot clear a newer successful override', async () => {
	const tracker = new KanbanMarkdownModeTracker();
	let rejectFirst: (error: Error) => void = () => undefined;
	let transitionCount = 0;
	const leaf = {
		id: 'leaf-1',
		view: { getState: () => ({ file: 'boards/one.md' }) },
		setViewState: () => {
			transitionCount += 1;
			if (transitionCount === 1) {
				return new Promise<void>((_resolve, reject) => {
					rejectFirst = reject;
				});
			}
			return Promise.resolve();
		},
	};

	const first = openTrackedMarkdownView(tracker, leaf as never, { readOnly: true });
	await openTrackedMarkdownView(tracker, leaf as never, { readOnly: false });
	rejectFirst(new Error('first transition failed'));
	await expect(first).rejects.toThrow('first transition failed');

	assert.strictEqual(tracker.get('leaf-1', 'boards/one.md'), 'editing');
});

void test('a newer failed transition restores the older transition it replaced', async () => {
	const tracker = new KanbanMarkdownModeTracker();
	let resolveFirst: () => void = () => undefined;
	let transitionCount = 0;
	const leaf = {
		id: 'leaf-1',
		view: { getState: () => ({ file: 'boards/one.md' }) },
		setViewState: () => {
			transitionCount += 1;
			if (transitionCount === 1) {
				return new Promise<void>((resolve) => {
					resolveFirst = resolve;
				});
			}
			return Promise.reject(new Error('newer transition failed'));
		},
	};

	const first = openTrackedMarkdownView(tracker, leaf as never, { readOnly: true });
	await expect(
		openTrackedMarkdownView(tracker, leaf as never, { readOnly: false }),
	).rejects.toThrow('newer transition failed');
	resolveFirst();
	await first;

	assert.strictEqual(tracker.get('leaf-1', 'boards/one.md'), 'readonly');
});
