import type { KanbanListItem } from '../kanban-list/types';
import type { App } from 'obsidian';

export type GanttScheduleRow = {
	id: string;
	title: string;
	boardPath: string;
	sourceEventPath: string;
	startKey: string;
	endKey: string;
	color: string;
};

export type GanttBoardSchedule = KanbanListItem & {
	rows: GanttScheduleRow[];
	linkedCardPaths: string[];
	linkedEventPaths: string[];
	dependencyPaths: string[];
};

export type GanttYearRow = GanttScheduleRow & {
	startDayIndex: number;
	spanDays: number;
};

export type GanttBoardLabel = {
	path: string;
	basename: string;
	kanbanColor?: string;
};

export type GanttDisplayRow = GanttYearRow & {
	boardLabel: GanttBoardLabel | null;
};

export type GanttBoardGroup = {
	path: string;
	basename: string;
	folderPath: string;
	folderDepth: number;
	mtime: number;
	kanbanColor?: string;
	rows: GanttYearRow[];
};

export type GanttMonthCell = {
	key: string;
	label: string;
	dayCount: number;
	startDayIndex: number;
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
	boardGroups: GanttBoardGroup[];
	rows: GanttDisplayRow[];
};

export type GanttPluginContext = {
	app: App;
	settings: {
		calendarFolderPath: string;
	};
	openKanbanBoard: (boardPath: string) => Promise<void>;
};
