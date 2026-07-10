import { createNotice } from '../shared/services/notice-service';
import { GanttHeader } from './_components/GanttHeader';
import { GanttStatePanel } from './_components/GanttStatePanel';
import { GanttYearGrid } from './_components/GanttYearGrid';
import { useGanttData } from './hooks/use-gantt-data';
import type { GanttPluginContext } from './types';
import { render } from 'preact';
import { useCallback, useMemo, useState } from 'preact/hooks';

type GanttRootProps = {
	plugin: GanttPluginContext;
};

const GanttRoot = ({ plugin }: GanttRootProps) => {
	const [scrollToTodayRequestKey, setScrollToTodayRequestKey] = useState(0);
	const notice = useMemo(createNotice, []);
	const {
		errorMessage,
		isLoading,
		yearView,
		selectedYear,
		goToCurrentYear,
		goToNextYear,
		goToPrevYear,
	} = useGanttData(plugin);

	const handleToday = () => {
		goToCurrentYear();
		setScrollToTodayRequestKey((current) => current + 1);
	};
	const handleOpenBoard = useCallback(
		async (boardPath: string) => {
			try {
				await plugin.openKanbanBoard(boardPath);
			} catch (error) {
				console.error('Failed to open kanban board from gantt', error);
				notice('Failed to open kanban board.');
			}
		},
		[notice, plugin],
	);

	return (
		<div className="flex h-full w-full flex-col overflow-hidden bg-[var(--background-primary)]">
			<GanttHeader
				year={selectedYear}
				onPrevYear={goToPrevYear}
				onNextYear={goToNextYear}
				onCurrentYear={handleToday}
			/>
			{isLoading ? (
				<GanttStatePanel message="Loading gantt data..." />
			) : errorMessage ? (
				<GanttStatePanel message={errorMessage} tone="error" />
			) : yearView.rows.length === 0 ? (
				<GanttStatePanel message={`No dated kanban events found for ${selectedYear}.`} />
			) : (
				<GanttYearGrid
					onOpenBoard={handleOpenBoard}
					scrollToTodayRequestKey={scrollToTodayRequestKey}
					view={yearView}
				/>
			)}
		</div>
	);
};

export const mountGanttUI = (containerEl: HTMLElement, plugin: GanttPluginContext): void => {
	render(<GanttRoot plugin={plugin} />, containerEl);
};

export const unmountGanttUI = (containerEl: HTMLElement): void => {
	render(null, containerEl);
};
