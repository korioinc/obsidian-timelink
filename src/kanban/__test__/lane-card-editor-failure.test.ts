import { useLaneCardEditorState } from '../hooks/use-lane-card-editor-state.ts';
import { assert, beforeEach, expect, test, vi } from 'vitest';

const hookHarness = vi.hoisted(() => ({
	index: 0,
	overrides: new Map<number, unknown>(),
	setters: [] as Array<ReturnType<typeof vi.fn>>,
}));

vi.mock('preact/hooks', () => ({
	useEffect: () => undefined,
	useRef: <T>(initial: T) => ({ current: initial }),
	useState: <T>(initial: T) => {
		const index = hookHarness.index;
		hookHarness.index += 1;
		const setter = vi.fn();
		hookHarness.setters[index] = setter;
		return [hookHarness.overrides.has(index) ? hookHarness.overrides.get(index) : initial, setter];
	},
}));

const createState = (callbacks: {
	onUpdateLaneTitle?: (laneId: string, title: string) => Promise<void>;
	onAddCard?: (laneId: string, title: string) => Promise<void>;
	onUpdateCardTitle?: (cardId: string, title: string) => Promise<void>;
}) =>
	useLaneCardEditorState({
		laneId: 'lane-1',
		laneTitle: 'Todo',
		onUpdateLaneTitle: callbacks.onUpdateLaneTitle ?? (() => Promise.resolve()),
		onAddCard: callbacks.onAddCard ?? (() => Promise.resolve()),
		onUpdateCardTitle: callbacks.onUpdateCardTitle ?? (() => Promise.resolve()),
	});

beforeEach(() => {
	hookHarness.index = 0;
	hookHarness.overrides.clear();
	hookHarness.setters.length = 0;
});

void test('failed card submission unlocks for retry and preserves the add draft', async () => {
	let attempts = 0;
	const onAddCard = vi.fn(() => {
		attempts += 1;
		return attempts === 1 ? Promise.reject(new Error('persist failed')) : Promise.resolve();
	});
	const state = createState({ onAddCard });

	await expect(state.submitCard('Keep this draft')).resolves.toBeUndefined();
	assert.strictEqual(hookHarness.setters[0]?.mock.calls.length, 0);
	assert.strictEqual(hookHarness.setters[1]?.mock.calls.length, 0);

	await expect(state.submitCard('Keep this draft')).resolves.toBeUndefined();
	assert.strictEqual(onAddCard.mock.calls.length, 2);
	assert.deepEqual(hookHarness.setters[1]?.mock.calls[0], ['']);
	assert.deepEqual(hookHarness.setters[0]?.mock.calls[0], [false]);
});

void test('failed lane title submission keeps title editing open', async () => {
	hookHarness.overrides.set(2, true);
	hookHarness.overrides.set(3, 'Updated lane');
	const state = createState({
		onUpdateLaneTitle: () => Promise.reject(new Error('persist failed')),
	});

	await expect(state.submitLaneTitle()).resolves.toBeUndefined();

	assert.strictEqual(hookHarness.setters[2]?.mock.calls.length, 0);
});

void test('failed card title submission keeps the editor and draft intact', async () => {
	hookHarness.overrides.set(4, 'card-1');
	hookHarness.overrides.set(5, 'Updated card');
	const state = createState({
		onUpdateCardTitle: () => Promise.reject(new Error('persist failed')),
	});

	await expect(state.submitCardEdit()).resolves.toBeUndefined();

	assert.strictEqual(hookHarness.setters[4]?.mock.calls.length, 0);
	assert.strictEqual(hookHarness.setters[5]?.mock.calls.length, 0);
});
