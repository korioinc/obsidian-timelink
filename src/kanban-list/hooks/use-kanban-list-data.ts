import { useDebouncedReload } from '../../shared/hooks/use-debounced-reload';
import { registerVaultRefresh } from '../../shared/vault/register-vault-refresh';
import { KANBAN_LIST_MAX_DEPTH } from '../constants';
import { collectKanbanBoards } from '../services/model-service';
import type { KanbanListItem } from '../types';
import { isPathWithinDepth, isWithinDepth } from '../utils/path';
import { type App } from 'obsidian';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

type UseKanbanListDataResult = {
	errorMessage: string | null;
	isLoading: boolean;
	isRefreshing: boolean;
	items: KanbanListItem[];
	reloadList: (manual?: boolean) => Promise<void>;
	scheduleReload: () => void;
};

export const useKanbanListData = (app: App): UseKanbanListDataResult => {
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [items, setItems] = useState<KanbanListItem[]>([]);
	const refreshFeedbackTimerRef = useRef<number | null>(null);

	const clearRefreshFeedbackTimer = useCallback(() => {
		if (refreshFeedbackTimerRef.current !== null) {
			window.clearTimeout(refreshFeedbackTimerRef.current);
			refreshFeedbackTimerRef.current = null;
		}
	}, []);

	const reloadList = useCallback(
		async (manual = false) => {
			const startedAt = Date.now();
			if (manual) {
				clearRefreshFeedbackTimer();
				setIsRefreshing(true);
			}
			setErrorMessage(null);
			setIsLoading(true);
			try {
				const nextItems = await collectKanbanBoards(app, KANBAN_LIST_MAX_DEPTH);
				setItems(nextItems);
			} catch (error) {
				console.error('Failed to collect kanban boards', error);
				setErrorMessage('Failed to load kanban boards.');
			} finally {
				setIsLoading(false);
				if (manual) {
					const elapsed = Date.now() - startedAt;
					const remaining = 320 - elapsed;
					if (remaining > 0) {
						refreshFeedbackTimerRef.current = window.setTimeout(() => {
							refreshFeedbackTimerRef.current = null;
							setIsRefreshing(false);
						}, remaining);
					} else {
						setIsRefreshing(false);
					}
				}
			}
		},
		[app, clearRefreshFeedbackTimer],
	);

	const { schedule: scheduleReload } = useDebouncedReload(() => {
		void reloadList();
	}, 150);

	useEffect(() => {
		void reloadList();
		return () => {
			clearRefreshFeedbackTimer();
		};
	}, [clearRefreshFeedbackTimer, reloadList]);

	useEffect(() => {
		return registerVaultRefresh(
			app.vault,
			(file, oldPath) =>
				isWithinDepth(file, KANBAN_LIST_MAX_DEPTH) ||
				isPathWithinDepth(oldPath, KANBAN_LIST_MAX_DEPTH),
			scheduleReload,
		);
	}, [app.vault, scheduleReload]);

	return {
		errorMessage,
		isLoading,
		isRefreshing,
		items,
		reloadList,
		scheduleReload,
	};
};
