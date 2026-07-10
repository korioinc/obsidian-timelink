import { registerWindowPointerMoveAndUp } from '../../hooks/window-pointer-events.ts';
import { afterEach, assert, test, vi } from 'vitest';

afterEach(() => {
	vi.unstubAllGlobals();
});

void test('pointercancel finalizes once and cleanup removes every window listener', () => {
	const listeners = new Map<string, Set<(event: PointerEvent) => void>>();
	vi.stubGlobal('window', {
		addEventListener: (type: string, listener: (event: PointerEvent) => void) => {
			const registered = listeners.get(type) ?? new Set();
			registered.add(listener);
			listeners.set(type, registered);
		},
		removeEventListener: (type: string, listener: (event: PointerEvent) => void) => {
			listeners.get(type)?.delete(listener);
		},
	});
	const handleMove = vi.fn();
	const handleFinalize = vi.fn();
	const unregister = registerWindowPointerMoveAndUp(handleMove, handleFinalize);
	const event = { pointerId: 1 } as PointerEvent;

	listeners.get('pointercancel')?.forEach((listener) => listener(event));
	listeners.get('pointerup')?.forEach((listener) => listener(event));

	assert.strictEqual(handleFinalize.mock.calls.length, 1);
	unregister();
	assert.strictEqual(listeners.get('pointermove')?.size, 0);
	assert.strictEqual(listeners.get('pointerup')?.size, 0);
	assert.strictEqual(listeners.get('pointercancel')?.size, 0);
});
