import { useCallback, useEffect, useRef } from 'preact/hooks';

type ReloadHandler = () => Promise<void> | void;

export const useDebouncedReload = (onReload: ReloadHandler, delayMs = 150) => {
	const timerRef = useRef<number | null>(null);

	const cancel = useCallback(() => {
		if (timerRef.current === null) return;
		window.clearTimeout(timerRef.current);
		timerRef.current = null;
	}, []);

	const schedule = useCallback(() => {
		cancel();
		timerRef.current = window.setTimeout(() => {
			timerRef.current = null;
			void onReload();
		}, delayMs);
	}, [cancel, delayMs, onReload]);

	useEffect(() => cancel, [cancel]);

	return { schedule, cancel };
};
