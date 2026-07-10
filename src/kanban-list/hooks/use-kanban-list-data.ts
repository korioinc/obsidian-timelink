import { useDebouncedReload } from '../../shared/hooks/use-debounced-reload';
import { KANBAN_LIST_MAX_DEPTH } from '../constants';
import { collectKanbanBoards } from '../services/model-service';
import { registerKanbanListRefresh } from '../services/refresh-service';
import type { KanbanListItem } from '../types';
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
	const requestVersionRef = useRef(0);
	const manualRequestRef = useRef(false);
	const boardPathsRef = useRef<Set<string>>(new Set());

	const clearRefreshFeedbackTimer = useCallback(() => {
		if (refreshFeedbackTimerRef.current !== null) {
			window.clearTimeout(refreshFeedbackTimerRef.current);
			refreshFeedbackTimerRef.current = null;
		}
	}, []);

	const reloadOnce = useCallback(async () => {
		const requestVersion = requestVersionRef.current;
		const manual = manualRequestRef.current;
		manualRequestRef.current = false;
		const startedAt = Date.now();
		setErrorMessage(null);
		setIsLoading(true);
		try {
			const nextItems = await collectKanbanBoards(app, KANBAN_LIST_MAX_DEPTH);
			if (requestVersion !== requestVersionRef.current) return;
			boardPathsRef.current = new Set(nextItems.map((item) => item.path));
			setItems(nextItems);
		} catch (error) {
			if (requestVersion !== requestVersionRef.current) return;
			console.error('Failed to collect kanban boards', error);
			setErrorMessage('Failed to load kanban boards.');
		} finally {
			if (requestVersion === requestVersionRef.current) {
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
				} else {
					setIsRefreshing(false);
				}
			}
		}
	}, [app, clearRefreshFeedbackTimer]);

	const invalidateRequest = useCallback(() => {
		requestVersionRef.current += 1;
	}, []);
	const { run, schedule: scheduleReload } = useDebouncedReload(reloadOnce, 150, invalidateRequest);
	const reloadList = useCallback(
		(manual = false): Promise<void> => {
			if (manual) {
				manualRequestRef.current = true;
				clearRefreshFeedbackTimer();
				setIsRefreshing(true);
			}
			return run();
		},
		[clearRefreshFeedbackTimer, run],
	);

	useEffect(() => {
		void reloadList();
		return () => {
			requestVersionRef.current += 1;
			clearRefreshFeedbackTimer();
		};
	}, [clearRefreshFeedbackTimer, reloadList]);

	useEffect(() => {
		return registerKanbanListRefresh({
			app,
			maxDepth: KANBAN_LIST_MAX_DEPTH,
			getBoardPaths: () => boardPathsRef.current,
			onReload: scheduleReload,
		});
	}, [app, scheduleReload]);

	return {
		errorMessage,
		isLoading,
		isRefreshing,
		items,
		reloadList,
		scheduleReload,
	};
};
