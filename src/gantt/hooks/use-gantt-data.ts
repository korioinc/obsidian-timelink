import { KANBAN_LIST_MAX_DEPTH } from '../../kanban-list/constants';
import { isPathWithinDepth, isWithinDepth } from '../../kanban-list/utils/path';
import { useDebouncedReload } from '../../shared/hooks/use-debounced-reload';
import { isPathInDirectory } from '../../shared/vault/register-vault-path-refresh';
import { registerVaultRefresh } from '../../shared/vault/register-vault-refresh';
import { buildGanttYearView, collectGanttBoardSchedules } from '../services/model-service';
import type { GanttBoardSchedule, GanttPluginContext } from '../types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

type UseGanttDataResult = {
	errorMessage: string | null;
	isLoading: boolean;
	selectedYear: number;
	yearView: ReturnType<typeof buildGanttYearView>;
	goToNextYear: () => void;
	goToPrevYear: () => void;
	goToCurrentYear: () => void;
};

export const useGanttData = (plugin: GanttPluginContext): UseGanttDataResult => {
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
	const [boards, setBoards] = useState<GanttBoardSchedule[]>([]);
	const dependencyPathsRef = useRef<Set<string>>(new Set());

	const reloadData = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const nextBoards = await collectGanttBoardSchedules({
				app: plugin.app,
				calendarFolderPath: plugin.settings.calendarFolderPath,
				maxDepth: KANBAN_LIST_MAX_DEPTH,
			});
			dependencyPathsRef.current = new Set(nextBoards.flatMap((board) => board.dependencyPaths));
			setBoards(nextBoards);
		} catch (error) {
			console.error('Failed to load gantt data', error);
			setErrorMessage('Failed to load gantt view.');
		} finally {
			setIsLoading(false);
		}
	}, [plugin.app, plugin.settings.calendarFolderPath]);

	const { schedule: scheduleReload } = useDebouncedReload(() => {
		void reloadData();
	}, 150);

	useEffect(() => {
		void reloadData();
	}, [reloadData]);

	useEffect(() => {
		return registerVaultRefresh(
			plugin.app.vault,
			(file, oldPath) =>
				isWithinDepth(file, KANBAN_LIST_MAX_DEPTH) ||
				isPathWithinDepth(oldPath, KANBAN_LIST_MAX_DEPTH) ||
				isPathInDirectory(file.path, plugin.settings.calendarFolderPath) ||
				isPathInDirectory(oldPath, plugin.settings.calendarFolderPath) ||
				dependencyPathsRef.current.has(file.path) ||
				(oldPath ? dependencyPathsRef.current.has(oldPath) : false),
			scheduleReload,
		);
	}, [plugin.app.vault, plugin.settings.calendarFolderPath, scheduleReload]);

	const yearView = useMemo(() => buildGanttYearView(boards, selectedYear), [boards, selectedYear]);

	return {
		errorMessage,
		isLoading,
		selectedYear,
		yearView,
		goToNextYear: () => setSelectedYear((current) => current + 1),
		goToPrevYear: () => setSelectedYear((current) => current - 1),
		goToCurrentYear: () => setSelectedYear(new Date().getFullYear()),
	};
};
