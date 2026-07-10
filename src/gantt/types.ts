import type { KanbanListItem } from '../kanban-list/types';
import type { App } from 'obsidian';

export type GanttScheduleRow = {
	id: string;
	title: string;
	startKey: string;
	endKey: string;
	color: string;
};

export type GanttBoardSchedule = Pick<KanbanListItem, 'path' | 'basename' | 'kanbanColor'> & {
	rows: GanttScheduleRow[];
	dependencyPaths: string[];
};

type GanttYearPlacement = Pick<GanttScheduleRow, 'id' | 'title' | 'color'> & {
	startDayIndex: number;
	spanDays: number;
};

export type GanttBoardLabel = {
	path: string;
	basename: string;
	kanbanColor?: string;
};

export type GanttDisplayRow = GanttYearPlacement & {
	boardLabel: GanttBoardLabel | null;
};

export type GanttMonthCell = {
	key: string;
	label: string;
	dayCount: number;
};

export type GanttDayCell = {
	key: string;
	label: string;
};

export type GanttYearView = {
	year: number;
	totalDays: number;
	months: GanttMonthCell[];
	dayCells: GanttDayCell[];
	todayDayIndex: number | null;
	rows: GanttDisplayRow[];
};

export type GanttCalendarDirectorySource = {
	getDirectory: () => string;
	onDirectoryChange: (listener: () => void) => () => void;
};

export type GanttPluginContext = {
	app: App;
	calendar: {
		getCalendar: () => GanttCalendarDirectorySource;
	};
	openKanbanBoard: (boardPath: string) => Promise<void>;
};
