import { registerVaultPathRefresh } from '../vault/register-vault-path-refresh';
import { useDebouncedReload } from './use-debounced-reload';
import type { App } from 'obsidian';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

type UseVaultPathDataLoaderParams<TData> = {
	app: App;
	directory: string | (() => string);
	load: () => Promise<TData>;
	onLoaded: (data: TData) => void;
	errorMessage: string;
	errorLogLabel: string;
	debounceMs?: number;
};

type UseVaultPathDataLoaderResult = {
	loadError: string | null;
	scheduleReload: () => void;
	reload: () => Promise<void>;
};

export const useVaultPathDataLoader = <TData>({
	app,
	directory,
	load,
	onLoaded,
	errorMessage,
	errorLogLabel,
	debounceMs = 150,
}: UseVaultPathDataLoaderParams<TData>): UseVaultPathDataLoaderResult => {
	const [loadError, setLoadError] = useState<string | null>(null);
	const requestVersionRef = useRef(0);

	const reloadOnce = useCallback(async () => {
		const requestVersion = requestVersionRef.current;
		setLoadError(null);
		try {
			const data = await load();
			if (requestVersion !== requestVersionRef.current) return;
			onLoaded(data);
		} catch (error) {
			if (requestVersion !== requestVersionRef.current) return;
			console.error(errorLogLabel, error);
			setLoadError(errorMessage);
		}
	}, [errorLogLabel, errorMessage, load, onLoaded]);

	const invalidateRequest = useCallback(() => {
		requestVersionRef.current += 1;
	}, []);
	const { run: reload, schedule: scheduleReload } = useDebouncedReload(
		reloadOnce,
		debounceMs,
		invalidateRequest,
	);

	useEffect(() => {
		void reload();
	}, [reload]);

	useEffect(
		() => () => {
			requestVersionRef.current += 1;
		},
		[],
	);

	useEffect(() => {
		return registerVaultPathRefresh(app.vault, directory, scheduleReload);
	}, [app.vault, directory, scheduleReload]);

	return {
		loadError,
		scheduleReload,
		reload,
	};
};
