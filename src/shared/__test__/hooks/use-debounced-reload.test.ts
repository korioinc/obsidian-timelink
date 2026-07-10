import { useDebouncedReload } from '../../hooks/use-debounced-reload.ts';
import { afterEach, assert, beforeEach, test, vi } from 'vitest';

type EffectCleanup = () => void;

const harness = vi.hoisted(() => ({
	cleanups: [] as EffectCleanup[],
}));
let scheduledTimer: (() => void) | null = null;

vi.mock('preact/hooks', () => ({
	useRef: <T>(initialValue: T) => ({ current: initialValue }),
	useCallback: <T extends (...args: never[]) => unknown>(callback: T) => callback,
	useEffect: (effect: () => void | EffectCleanup) => {
		const cleanup = effect();
		if (cleanup) harness.cleanups.push(cleanup);
	},
}));

beforeEach(() => {
	harness.cleanups.length = 0;
	scheduledTimer = null;
	vi.stubGlobal('window', {
		setTimeout: (callback: () => void) => {
			scheduledTimer = callback;
			return 1;
		},
		clearTimeout: () => {
			scheduledTimer = null;
		},
	});
});

afterEach(() => {
	harness.cleanups.forEach((cleanup) => cleanup());
	vi.unstubAllGlobals();
});

void test('useDebouncedReload coalesces requests that arrive while a reload is running', async () => {
	let activeReloads = 0;
	let maxActiveReloads = 0;
	let reloadCount = 0;
	let requestCount = 0;
	let releaseFirstReload: () => void = () => undefined;
	const firstReloadGate = new Promise<void>((resolve) => {
		releaseFirstReload = resolve;
	});
	const onReload = async () => {
		reloadCount += 1;
		activeReloads += 1;
		maxActiveReloads = Math.max(maxActiveReloads, activeReloads);
		if (reloadCount === 1) await firstReloadGate;
		activeReloads -= 1;
	};

	const { run, schedule } = useDebouncedReload(onReload, 5, () => {
		requestCount += 1;
	});
	const running = run();
	schedule();
	schedule();
	assert.strictEqual(requestCount, 3);
	const timer = scheduledTimer;
	assert.ok(timer);
	timer();
	await Promise.resolve();

	assert.strictEqual(reloadCount, 1);
	releaseFirstReload();
	await running;

	assert.strictEqual(reloadCount, 2);
	assert.strictEqual(maxActiveReloads, 1);
});

void test('a failed reload does not leak a pending request into the next run', async () => {
	let reloadCount = 0;
	const { run, schedule } = useDebouncedReload(
		() => {
			reloadCount += 1;
			return reloadCount === 1 ? Promise.reject(new Error('load failed')) : Promise.resolve();
		},
		5,
		undefined,
		() => undefined,
	);

	const failedRun = run();
	const observedFailure = failedRun.catch((error: unknown) => error);
	schedule();
	const timer = scheduledTimer;
	assert.ok(timer);
	timer();
	assert.match(String(await observedFailure), /load failed/);

	await run();
	assert.strictEqual(reloadCount, 2);
});

void test('a schedule-only reload failure is observed instead of becoming unhandled', async () => {
	const errors: unknown[] = [];
	const { schedule } = useDebouncedReload(
		() => Promise.reject(new Error('scheduled failure')),
		5,
		undefined,
		(error) => errors.push(error),
	);

	schedule();
	const timer = scheduledTimer;
	assert.ok(timer);
	timer();
	await vi.waitFor(() => assert.strictEqual(errors.length, 1));

	assert.match(String(errors[0]), /scheduled failure/);
});
