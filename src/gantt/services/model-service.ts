import { KANBAN_LIST_MAX_DEPTH } from '../../kanban-list/constants';
import { collectKanbanBoards } from '../../kanban-list/services/model-service';
import type { KanbanCollectionApp } from '../../kanban-list/services/model-service';
import type { KanbanListItem } from '../../kanban-list/types';
import { resolveLinkedCardFile } from '../../kanban/services/card-service';
import { parseKanbanBoard } from '../../kanban/services/parser-service';
import { getFirstWikiLinkPath } from '../../kanban/utils/card-title';
import { resolveNormalizedEventDateRange } from '../../shared/event/date-range';
import {
	compareDateKey,
	DEFAULT_EVENT_COLOR,
	diffInDays,
	formatDateKey,
	normalizeEventColor,
	parseDateKey,
} from '../../shared/event/model-utils';
import { toEventFromFrontmatter } from '../../shared/event/note-calendar-utils';
import { readFrontmatterValue } from '../../shared/frontmatter/file-frontmatter';
import { TIMELINK_EVENT_KEY } from '../../shared/frontmatter/timelink-frontmatter';
import { mapWithConcurrency } from '../../shared/utils/map-with-concurrency';
import { isPathInDirectory } from '../../shared/vault/register-vault-path-refresh';
import type {
	GanttBoardSchedule,
	GanttDayCell,
	GanttDisplayRow,
	GanttMonthCell,
	GanttScheduleRow,
	GanttYearView,
} from '../types';
import type { TFile } from 'obsidian';

type CollectGanttBoardSchedulesParams = {
	app: KanbanCollectionApp & {
		vault: KanbanCollectionApp['vault'] & {
			getAbstractFileByPath: (path: string) => unknown;
		};
		metadataCache: KanbanCollectionApp['metadataCache'] & {
			getFirstLinkpathDest: (path: string, sourcePath: string) => unknown;
		};
	};
	calendarFolderPath: string;
	maxDepth?: number;
};

type FileLike = TFile & { path: string; basename: string };

const isFileLike = (file: unknown): file is FileLike => {
	if (!file || typeof file !== 'object') return false;
	const path = (file as { path?: unknown }).path;
	const basename = (file as { basename?: unknown }).basename;
	return typeof path === 'string' && typeof basename === 'string';
};

const compareRows = (left: GanttScheduleRow, right: GanttScheduleRow): number => {
	const startCompare = compareDateKey(left.startKey, right.startKey);
	if (startCompare !== 0) return startCompare;
	return left.title.localeCompare(right.title);
};

const GANTT_BOARD_READ_CONCURRENCY = 4;

const buildYearBoundaryDateKey = (year: number, month: number, day: number): string =>
	`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const clampDateKey = (value: string, min: string, max: string): string => {
	if (compareDateKey(value, min) < 0) return min;
	if (compareDateKey(value, max) > 0) return max;
	return value;
};

const buildMonthCells = (year: number): GanttMonthCell[] => {
	const formatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
	return Array.from({ length: 12 }, (_, monthIndex) => {
		const firstDay = new Date(year, monthIndex, 1);
		const dayCount = new Date(year, monthIndex + 1, 0).getDate();
		return {
			key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
			label: formatter.format(firstDay),
			dayCount,
		};
	});
};

const buildDayCells = (months: GanttMonthCell[]): GanttDayCell[] =>
	months.flatMap((month) =>
		Array.from({ length: month.dayCount }, (_, dayIndex) => ({
			key: `${month.key}-${String(dayIndex + 1).padStart(2, '0')}`,
			label: `${dayIndex + 1}`,
		})),
	);

const collectGanttBoardSchedule = async (
	app: CollectGanttBoardSchedulesParams['app'],
	calendarFolderPath: string,
	boardItem: KanbanListItem,
): Promise<GanttBoardSchedule | null> => {
	const boardFile = app.vault.getAbstractFileByPath(boardItem.path);
	if (!isFileLike(boardFile)) return null;
	const markdown = await app.vault.cachedRead(boardFile);
	const board = parseKanbanBoard(markdown);
	const dependencyPaths = new Set<string>([boardItem.path]);
	const linkedEventFiles = new Set<FileLike>();

	for (const lane of board.lanes) {
		for (const card of lane.cards) {
			const linkedCardFile = resolveLinkedCardFile(app, boardFile.path, card.title);
			if (!linkedCardFile) continue;
			dependencyPaths.add(linkedCardFile.path);
			const eventLinkValue = readFrontmatterValue(app, linkedCardFile, TIMELINK_EVENT_KEY);
			if (typeof eventLinkValue !== 'string' || !eventLinkValue.trim()) continue;
			const eventPath = getFirstWikiLinkPath(eventLinkValue);
			if (!eventPath) continue;
			const eventFile = app.metadataCache.getFirstLinkpathDest(eventPath, linkedCardFile.path);
			if (isFileLike(eventFile)) {
				linkedEventFiles.add(eventFile);
			}
		}
	}

	const rows: GanttScheduleRow[] = [];
	for (const eventFile of linkedEventFiles) {
		if (!isPathInDirectory(eventFile.path, calendarFolderPath)) continue;
		dependencyPaths.add(eventFile.path);
		const frontmatter = app.metadataCache.getFileCache(eventFile)?.frontmatter;
		if (!frontmatter) continue;
		const event = toEventFromFrontmatter(frontmatter, eventFile.basename);
		const range = resolveNormalizedEventDateRange(event);
		if (!range) continue;
		rows.push({
			id: `${boardFile.path}:${eventFile.path}`,
			title: event.title,
			startKey: range.startKey,
			endKey: range.endKey,
			color: normalizeEventColor(event.color) ?? boardItem.kanbanColor ?? DEFAULT_EVENT_COLOR,
		});
	}

	return {
		path: boardItem.path,
		basename: boardItem.basename,
		kanbanColor: boardItem.kanbanColor,
		rows: rows.sort(compareRows),
		dependencyPaths: Array.from(dependencyPaths).sort(),
	};
};

export const collectGanttBoardSchedules = async ({
	app,
	calendarFolderPath,
	maxDepth = KANBAN_LIST_MAX_DEPTH,
}: CollectGanttBoardSchedulesParams): Promise<GanttBoardSchedule[]> => {
	const boards = await collectKanbanBoards(app, maxDepth);
	const schedules = await mapWithConcurrency(boards, GANTT_BOARD_READ_CONCURRENCY, (board) =>
		collectGanttBoardSchedule(app, calendarFolderPath, board),
	);
	return schedules.filter((schedule): schedule is GanttBoardSchedule => schedule !== null);
};

export const buildGanttYearView = (
	boards: GanttBoardSchedule[],
	year: number,
	todayDate = new Date(),
): GanttYearView => {
	const yearStartKey = buildYearBoundaryDateKey(year, 1, 1);
	const yearEndKey = buildYearBoundaryDateKey(year, 12, 31);
	const yearStartDate = parseDateKey(yearStartKey);
	const months = buildMonthCells(year);
	const todayKey = formatDateKey(todayDate);
	const todayDayIndex =
		todayDate.getFullYear() === year ? diffInDays(yearStartDate, parseDateKey(todayKey)) : null;
	const rows: GanttDisplayRow[] = boards.flatMap((board) => {
		const visibleRows = board.rows
			.filter((row) => compareDateKey(row.endKey, yearStartKey) >= 0)
			.filter((row) => compareDateKey(row.startKey, yearEndKey) <= 0)
			.map((row) => {
				const startKey = clampDateKey(row.startKey, yearStartKey, yearEndKey);
				const endKey = clampDateKey(row.endKey, yearStartKey, yearEndKey);
				return {
					id: row.id,
					title: row.title,
					color: row.color,
					startDayIndex: diffInDays(yearStartDate, parseDateKey(startKey)),
					spanDays: diffInDays(parseDateKey(startKey), parseDateKey(endKey)) + 1,
				};
			});

		return visibleRows.map((row, index) => ({
			...row,
			boardLabel:
				index === 0
					? {
							path: board.path,
							basename: board.basename,
							kanbanColor: board.kanbanColor,
						}
					: null,
		}));
	});

	return {
		year,
		totalDays: diffInDays(parseDateKey(yearStartKey), parseDateKey(yearEndKey)) + 1,
		months,
		dayCells: buildDayCells(months),
		todayDayIndex,
		rows,
	};
};
