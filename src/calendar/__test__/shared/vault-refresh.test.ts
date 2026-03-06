import {
	isPathInDirectory,
	registerVaultPathRefresh,
} from '../../../shared/vault/register-vault-path-refresh.ts';
import { assert, test } from 'vitest';

type EventName = 'create' | 'modify' | 'delete' | 'rename';

type Callback = (file: { path?: string | null }, oldPath?: string) => void;

type FakeVault = {
	on: (event: EventName, callback: Callback) => void;
	off: (event: EventName, callback: Callback) => void;
	trigger: (event: EventName, path: string, oldPath?: string) => void;
};

const createFakeVault = (): FakeVault => {
	const listeners = new Map<EventName, Set<Callback>>();
	const ensure = (event: EventName) => {
		const current = listeners.get(event);
		if (current) return current;
		const next = new Set<Callback>();
		listeners.set(event, next);
		return next;
	};
	return {
		on: (event, callback) => {
			ensure(event).add(callback);
		},
		off: (event, callback) => {
			ensure(event).delete(callback);
		},
		trigger: (event, path, oldPath) => {
			for (const callback of ensure(event)) {
				callback({ path }, oldPath);
			}
		},
	};
};

void test('isPathInDirectory matches directory and descendants only', () => {
	assert.strictEqual(isPathInDirectory('calendar', 'calendar'), true);
	assert.strictEqual(isPathInDirectory('calendar/day.md', 'calendar'), true);
	assert.strictEqual(isPathInDirectory('calendar2/day.md', 'calendar'), false);
	assert.strictEqual(isPathInDirectory('', 'calendar'), false);
	assert.strictEqual(isPathInDirectory(null, 'calendar'), false);
});

void test('registerVaultPathRefresh reacts only to matching paths and unsubscribes cleanly', () => {
	const calls: string[] = [];
	const fakeVault = createFakeVault();
	const unregister = registerVaultPathRefresh(
		fakeVault as unknown as import('obsidian').Vault,
		'calendar',
		() => {
			calls.push('reload');
		},
	);

	fakeVault.trigger('create', 'calendar/a.md');
	fakeVault.trigger('modify', 'calendar/b.md');
	fakeVault.trigger('delete', 'other/c.md');
	fakeVault.trigger('rename', 'calendar');
	fakeVault.trigger('rename', 'outside/renamed.md', 'calendar/renamed.md');

	assert.deepEqual(calls, ['reload', 'reload', 'reload', 'reload']);

	unregister();
	fakeVault.trigger('create', 'calendar/d.md');
	assert.deepEqual(calls, ['reload', 'reload', 'reload', 'reload']);
});
