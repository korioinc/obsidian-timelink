import { registerVaultPathRefresh } from '../vault/register-vault-path-refresh';
import { useDebouncedReload } from './use-debounced-reload';
import type { App } from 'obsidian';
import { useCallback, useEffect, useState } from 'preact/hooks';

type UseVaultPathDataLoaderParams<TData> = {
	app: App;
	directory: string;
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

	const reload = useCallback(async () => {
		setLoadError(null);
		try {
			const data = await load();
			onLoaded(data);
		} catch (error) {
			console.error(errorLogLabel, error);
			setLoadError(errorMessage);
		}
	}, [errorLogLabel, errorMessage, load, onLoaded]);

	const { schedule: scheduleReload } = useDebouncedReload(reload, debounceMs);

	useEffect(() => {
		void reload();
	}, [reload]);

	useEffect(() => {
		return registerVaultPathRefresh(app.vault, directory, scheduleReload);
	}, [app.vault, directory, scheduleReload]);

	return {
		loadError,
		scheduleReload,
		reload,
	};
};
