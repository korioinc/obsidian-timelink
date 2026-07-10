import { useCallback, useEffect, useRef } from 'preact/hooks';

type ReloadHandler = () => Promise<void> | void;

export const useDebouncedReload = (
	onReload: ReloadHandler,
	delayMs = 150,
	onRequest?: () => void,
	onScheduledError: (error: unknown) => void = (error) => {
		console.error('Scheduled reload failed', error);
	},
) => {
	const timerRef = useRef<number | null>(null);
	const runningRef = useRef<Promise<void> | null>(null);
	const pendingRef = useRef(false);
	const disposedRef = useRef(false);
	const onReloadRef = useRef(onReload);
	const onRequestRef = useRef(onRequest);
	const onScheduledErrorRef = useRef(onScheduledError);
	onReloadRef.current = onReload;
	onRequestRef.current = onRequest;
	onScheduledErrorRef.current = onScheduledError;

	const cancel = useCallback(() => {
		if (timerRef.current === null) return;
		window.clearTimeout(timerRef.current);
		timerRef.current = null;
	}, []);

	const enqueue = useCallback((): Promise<void> => {
		if (disposedRef.current) return Promise.resolve();
		if (runningRef.current) {
			pendingRef.current = true;
			return runningRef.current;
		}

		const running = Promise.resolve().then(async () => {
			try {
				let firstRun = true;
				while (!disposedRef.current) {
					if (!firstRun) pendingRef.current = false;
					await onReloadRef.current();
					firstRun = false;
					if (!pendingRef.current) break;
				}
			} finally {
				pendingRef.current = false;
				runningRef.current = null;
			}
		});
		runningRef.current = running;
		return running;
	}, []);

	const run = useCallback((): Promise<void> => {
		onRequestRef.current?.();
		return enqueue();
	}, [enqueue]);

	const schedule = useCallback(() => {
		cancel();
		onRequestRef.current?.();
		timerRef.current = window.setTimeout(() => {
			timerRef.current = null;
			void enqueue().catch((error: unknown) => onScheduledErrorRef.current(error));
		}, delayMs);
	}, [cancel, delayMs, enqueue]);

	useEffect(
		() => () => {
			disposedRef.current = true;
			pendingRef.current = false;
			cancel();
		},
		[cancel],
	);

	return { run, schedule, cancel };
};
