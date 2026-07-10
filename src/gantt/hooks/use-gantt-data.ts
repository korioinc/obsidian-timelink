import { KANBAN_LIST_MAX_DEPTH } from '../../kanban-list/constants';
import { formatDateKey, parseDateKey } from '../../shared/event/model-utils';
import { useDebouncedReload } from '../../shared/hooks/use-debounced-reload';
import { useMinuteTicker } from '../../shared/hooks/use-minute-ticker';
import { buildGanttYearView, collectGanttBoardSchedules } from '../services/model-service';
import { registerGanttDataRefresh } from '../services/refresh-service';
import type {
	GanttBoardSchedule,
	GanttCalendarDirectorySource,
	GanttPluginContext,
} from '../types';
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

export const subscribeToGanttCalendarDirectory = (
	calendar: GanttCalendarDirectorySource,
	onDirectoryChange: (directory: string) => void,
): (() => void) => {
	onDirectoryChange(calendar.getDirectory());
	return calendar.onDirectoryChange(() => onDirectoryChange(calendar.getDirectory()));
};

export const useGanttData = (plugin: GanttPluginContext): UseGanttDataResult => {
	const calendar = plugin.calendar.getCalendar();
	const [calendarFolderPath, setCalendarFolderPath] = useState(() => calendar.getDirectory());
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
	const [boards, setBoards] = useState<GanttBoardSchedule[]>([]);
	const dependencyPathsRef = useRef<Set<string>>(new Set());
	const requestVersionRef = useRef(0);
	const currentDayKey = formatDateKey(useMinuteTicker());

	const reloadOnce = useCallback(async () => {
		const requestVersion = requestVersionRef.current;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const nextBoards = await collectGanttBoardSchedules({
				app: plugin.app,
				calendarFolderPath,
				maxDepth: KANBAN_LIST_MAX_DEPTH,
			});
			if (requestVersion !== requestVersionRef.current) return;
			dependencyPathsRef.current = new Set(nextBoards.flatMap((board) => board.dependencyPaths));
			setBoards(nextBoards);
		} catch (error) {
			if (requestVersion !== requestVersionRef.current) return;
			console.error('Failed to load gantt data', error);
			setErrorMessage('Failed to load gantt view.');
		} finally {
			if (requestVersion === requestVersionRef.current) {
				setIsLoading(false);
			}
		}
	}, [calendarFolderPath, plugin.app]);

	const invalidateRequest = useCallback(() => {
		requestVersionRef.current += 1;
	}, []);
	const { run: reloadData, schedule: scheduleReload } = useDebouncedReload(
		reloadOnce,
		150,
		invalidateRequest,
	);

	useEffect(() => {
		return subscribeToGanttCalendarDirectory(calendar, setCalendarFolderPath);
	}, [calendar]);

	useEffect(() => {
		void reloadData();
		return () => {
			requestVersionRef.current += 1;
		};
	}, [calendarFolderPath, reloadData]);

	useEffect(() => {
		return registerGanttDataRefresh({
			app: plugin.app,
			calendarFolderPath,
			maxDepth: KANBAN_LIST_MAX_DEPTH,
			getDependencyPaths: () => dependencyPathsRef.current,
			onReload: scheduleReload,
		});
	}, [calendarFolderPath, plugin.app, scheduleReload]);

	const yearView = useMemo(
		() => buildGanttYearView(boards, selectedYear, parseDateKey(currentDayKey)),
		[boards, currentDayKey, selectedYear],
	);

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
